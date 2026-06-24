import { NextResponse, type NextRequest } from 'next/server'
import OpenAI from 'openai'
import { and, desc, eq, ilike, inArray, isNull, or } from 'drizzle-orm'
import { runInTenant, schema, decrypt } from '@tradepilot/db'
import { env, flags } from '@tradepilot/shared/env'
import { getMailboxProviderForIdentity } from '@tradepilot/shared/providers/server'
import { resolveTenantContext } from '@/lib/auth/resolve-tenant'
import { requireRole } from '@/lib/auth/roles'

const { leads, contacts, messages, emailIdentities } = schema

type Tenant = Awaited<ReturnType<typeof resolveTenantContext>>

const SYSTEM = [
  'You are the TradePilot sales copilot for a B2B export business. You help the user find leads,',
  'read their inbox, and write + send cold/follow-up emails through their connected mailbox.',
  'You have tools: search_leads, read_inbox, send_email.',
  'Rules:',
  '- When asked to email someone, FIRST write the full draft (subject + body) in your reply and ask the user to confirm. Only call send_email AFTER the user clearly confirms ("send it", "yes send").',
  '- Keep emails spam-safe: concise, personalized to the company, one clear CTA, no spam-trigger words (free, act now, guarantee, click here, $$$), no ALL-CAPS.',
  '- If send_email returns an error (e.g. no connected mailbox), tell the user to connect Gmail in Settings.',
  '- Be concise and concrete. Use the tools to ground answers in real tenant data rather than guessing.',
].join('\n')

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_leads',
      description: 'Search the tenant\'s leads (companies) and their primary contact email. Use to find who to email.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'optional text to match company name, country, or industry' },
          limit: { type: 'number', description: 'max results (default 10, max 25)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_inbox',
      description: 'List the most recent received (inbound) emails for the tenant.',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number', description: 'max messages (default 10, max 25)' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send an email through the connected mailbox. Only call after the user confirms the draft.',
      parameters: {
        type: 'object',
        required: ['to', 'subject', 'body'],
        properties: {
          to: { type: 'string', description: 'recipient email address' },
          subject: { type: 'string' },
          body: { type: 'string', description: 'plain-text email body' },
        },
      },
    },
  },
]

function safeParse(json: string): Record<string, unknown> {
  try {
    const v = JSON.parse(json)
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

async function searchLeads(partial: Tenant, args: Record<string, unknown>): Promise<unknown> {
  const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 25)
  const query = typeof args.query === 'string' && args.query.trim() ? `%${args.query.trim()}%` : null
  return runInTenant(partial, async (ctx) => {
    requireRole(ctx, 'member')
    const where = query
      ? and(
          isNull(leads.deletedAt),
          or(ilike(leads.companyName, query), ilike(leads.country, query), ilike(leads.industry, query)),
        )!
      : isNull(leads.deletedAt)
    const rows = await ctx.db.leads.findMany({ where, orderBy: desc(leads.icpScore), limit })
    const ids = rows.map((r) => r.id)
    const cts = ids.length
      ? await ctx.db.contacts.findMany({
          where: and(inArray(contacts.leadId, ids), isNull(contacts.deletedAt))!,
          limit: 200,
        })
      : []
    const byLead = new Map<string, (typeof cts)[number]>()
    for (const c of cts) if (!byLead.has(c.leadId) || c.isPrimary) byLead.set(c.leadId, c)
    return rows.map((r) => {
      const c = byLead.get(r.id)
      return {
        company: r.companyName,
        country: r.country,
        industry: r.industry,
        icpScore: r.icpScore,
        contactName: c ? [c.firstName, c.lastName].filter(Boolean).join(' ') || null : null,
        email: c?.email ?? null,
      }
    })
  })
}

async function readInbox(partial: Tenant, args: Record<string, unknown>): Promise<unknown> {
  const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 25)
  return runInTenant(partial, async (ctx) => {
    requireRole(ctx, 'member')
    const rows = await ctx.db.messages.findMany({
      where: and(eq(messages.direction, 'inbound'), isNull(messages.deletedAt))!,
      orderBy: desc(messages.receivedAt),
      limit,
    })
    return rows.map((r) => ({
      from: r.fromAddress,
      subject: r.subject,
      snippet: (r.bodyText ?? r.bodyHtml ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200),
      receivedAt: r.receivedAt ? new Date(r.receivedAt).toISOString() : null,
    }))
  })
}

async function sendEmailTool(partial: Tenant, args: Record<string, unknown>): Promise<unknown> {
  const to = typeof args.to === 'string' ? args.to.trim() : ''
  const subject = typeof args.subject === 'string' ? args.subject : ''
  const bodyText = typeof args.body === 'string' ? args.body : ''
  if (!to || !subject || !bodyText) return { ok: false, error: 'to, subject and body are required.' }

  const identity = await runInTenant(partial, async (ctx) => {
    requireRole(ctx, 'admin')
    return ctx.db.emailIdentities.findFirst(
      and(eq(emailIdentities.sendingEnabled, true), isNull(emailIdentities.deletedAt))!,
    )
  })
  if (!identity) return { ok: false, error: 'No sending-enabled mailbox. Connect Gmail in Settings first.' }

  const provider = getMailboxProviderForIdentity(identity)
  let accessToken: string
  try {
    accessToken = identity.accessTokenEnc ? decrypt(identity.accessTokenEnc, partial.tenantId) : ''
  } catch {
    return { ok: false, error: 'Mailbox token is invalid; reconnect the mailbox.' }
  }

  let result
  try {
    result = await provider.send({ accessToken, from: identity.email, to, subject, text: bodyText })
  } catch (e) {
    return { ok: false, error: String((e as Error).message).slice(0, 200) }
  }

  await runInTenant(partial, async (ctx) => {
    await ctx.db.messages.insert({
      direction: 'outbound',
      status: 'sent',
      fromAddress: identity.email,
      toAddress: to,
      subject,
      bodyText,
      providerMessageId: result.providerMessageId,
      threadId: result.threadId ?? null,
      sentAt: new Date(),
      emailIdentityId: identity.id,
      aiMeta: { generatedByAi: true, model: env.OPENAI_MODEL },
    } as never)
  })
  return { ok: true, to, from: identity.email }
}

async function runTool(name: string, partial: Tenant, args: Record<string, unknown>): Promise<unknown> {
  try {
    if (name === 'search_leads') return await searchLeads(partial, args)
    if (name === 'read_inbox') return await readInbox(partial, args)
    if (name === 'send_email') return await sendEmailTool(partial, args)
    return { error: `unknown tool ${name}` }
  } catch (e) {
    return { error: String((e as Error).message).slice(0, 200) }
  }
}

export async function POST(req: NextRequest) {
  if (!flags.isAiEnabled || !env.OPENAI_API_KEY) {
    return NextResponse.json({ reply: 'AI is not configured. Set OPENAI_API_KEY to enable the copilot.' })
  }

  let partial: Tenant
  try {
    partial = await resolveTenantContext()
  } catch {
    return NextResponse.json({ reply: 'You need to be signed in to use the copilot.' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as { messages?: unknown } | null
  const incoming = Array.isArray(body?.messages) ? body!.messages : []
  const history = incoming
    .filter((m): m is { role: string; content: string } => !!m && typeof (m as { content?: unknown }).content === 'string')
    .slice(-20)
    .map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: String(m.content).slice(0, 8000),
    }))
  if (history.length === 0) return NextResponse.json({ reply: 'Ask me anything about your leads or inbox.' })

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY })
  const convo: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM },
    ...history,
  ]

  try {
    for (let step = 0; step < 6; step++) {
      const completion = await client.chat.completions.create({
        model: env.OPENAI_MODEL,
        temperature: 0.3,
        messages: convo,
        tools: TOOLS,
        tool_choice: 'auto',
      })
      const msg = completion.choices[0]?.message
      if (!msg) break
      convo.push(msg as OpenAI.Chat.Completions.ChatCompletionMessageParam)

      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        return NextResponse.json({ reply: msg.content ?? '' })
      }

      for (const tc of msg.tool_calls) {
        if (tc.type !== 'function') continue
        const args = safeParse(tc.function.arguments)
        const result = await runTool(tc.function.name, partial, args)
        convo.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result).slice(0, 8000),
        })
      }
    }
    return NextResponse.json({ reply: "I couldn't finish that — try rephrasing or breaking it into steps." })
  } catch (e) {
    return NextResponse.json({ reply: `AI error: ${String((e as Error).message).slice(0, 200)}` }, { status: 200 })
  }
}
