'use server'

import { runInTenant, schema } from '@tradepilot/db'
import { and, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm'
import { z } from 'zod'
import { resolveTenantContext } from '@/lib/auth/resolve-tenant'
import { requireRole } from '@/lib/auth/roles'
import { withAction, type Result } from '@/server/result'
import { INQUIRY_INTENTS } from '@/server/inquiry/schemas'
import { LEAD_STAGES } from '@/server/leads/schemas'
import { TASK_STATUSES } from '@/server/followup/schemas'

const { leads, messages, inquiries, followUpTasks } = schema

// The effective "sent" date. sentAt is nullable (a row can be 'sent' before sentAt
// is written), so the funnel count and the KPI/timeseries must share this same
// expression or they visibly disagree on the dashboard.
const sentDate = sql`coalesce(${messages.sentAt}, ${messages.createdAt})`

const analyticsInputSchema = z
  .object({
    rangeDays: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
  })
  .default({})

export type AnalyticsRangeDays = z.infer<typeof analyticsInputSchema>['rangeDays']

export interface AnalyticsKpis {
  leadsAdded: number
  outboundSent: number
  inboundInquiries: number
  openFollowUps: number
  replyRate: number
}

export interface AnalyticsTimeseriesPoint {
  date: string
  outboundSent: number
  inboundReceived: number
  inquiriesCreated: number
}

export interface OutreachFunnel {
  pendingApproval: number
  queuedOrScheduled: number
  sentOrDelivered: number
  bouncedFailedSuppressed: number
  inquiriesTriaged: number
}

export interface InquiryIntentBreakdownItem {
  intent: (typeof INQUIRY_INTENTS)[number]
  count: number
}

export interface LeadStageBreakdownItem {
  stage: (typeof LEAD_STAGES)[number]
  count: number
}

export interface FollowUpStatusBreakdownItem {
  status: (typeof TASK_STATUSES)[number]
  count: number
}

export interface AnalyticsReportDTO {
  rangeDays: AnalyticsRangeDays
  from: string
  to: string
  kpis: AnalyticsKpis
  timeseries: AnalyticsTimeseriesPoint[]
  outreachFunnel: OutreachFunnel
  inquiryIntentBreakdown: InquiryIntentBreakdownItem[]
  leadStageBreakdown: LeadStageBreakdownItem[]
  followUpStatusBreakdown: FollowUpStatusBreakdownItem[]
}

const OUTBOUND_SENT_STATUSES = ['sent', 'delivered', 'opened', 'clicked', 'replied'] as const
const OPEN_FOLLOWUP_STATUSES = ['open', 'in_progress', 'snoozed'] as const
const QUEUED_OR_SCHEDULED_STATUSES = ['queued', 'scheduled'] as const
const FAILED_SUPPRESSED_STATUSES = ['bounced', 'failed', 'suppressed'] as const
const TRIAGED_INQUIRY_STATUSES = ['triaged', 'responded', 'won', 'lost', 'ignored'] as const

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function addUtcDays(d: Date, days: number): Date {
  const next = new Date(d)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function buildSeries(rangeStart: Date, rangeDays: AnalyticsRangeDays): AnalyticsTimeseriesPoint[] {
  const out: AnalyticsTimeseriesPoint[] = []
  for (let i = 0; i < rangeDays; i++) {
    const day = addUtcDays(rangeStart, i)
    out.push({
      date: toDateKey(day),
      outboundSent: 0,
      inboundReceived: 0,
      inquiriesCreated: 0,
    })
  }
  return out
}

async function fetchAll<T>(
  getChunk: (args: { limit: number; offset: number }) => Promise<T[]>,
): Promise<T[]> {
  const out: T[] = []
  const limit = 1000
  for (let offset = 0; ; offset += limit) {
    const rows = await getChunk({ limit, offset })
    out.push(...rows)
    if (rows.length < limit) return out
  }
}

export async function getAnalyticsReport(input: unknown): Promise<Result<AnalyticsReportDTO>> {
  return withAction(async () => {
    const { rangeDays } = analyticsInputSchema.parse(input)
    const rangeEndExclusive = addUtcDays(startOfUtcDay(new Date()), 1)
    const rangeStart = addUtcDays(rangeEndExclusive, -rangeDays)
    const partial = await resolveTenantContext()

    return runInTenant(partial, async (ctx) => {
      requireRole(ctx, 'member')

      const [leadsAdded, openFollowUps, pendingApproval, queuedOrScheduled, sentOrDelivered, bouncedFailedSuppressed, inquiriesTriaged, outboundRows, inboundRows, inquiryRows, leadStageBreakdown, followUpStatusBreakdown] =
        await Promise.all([
          ctx.db.leads.count(
            and(
              gte(leads.createdAt, rangeStart),
              lt(leads.createdAt, rangeEndExclusive),
              isNull(leads.deletedAt),
            )!,
          ),
          ctx.db.followUpTasks.count(
            and(
              inArray(followUpTasks.status, [...OPEN_FOLLOWUP_STATUSES]),
              isNull(followUpTasks.deletedAt),
            )!,
          ),
          ctx.db.messages.count(
            and(
              eq(messages.direction, 'outbound'),
              eq(messages.status, 'pending_approval'),
              gte(messages.createdAt, rangeStart),
              lt(messages.createdAt, rangeEndExclusive),
              isNull(messages.deletedAt),
            )!,
          ),
          ctx.db.messages.count(
            and(
              eq(messages.direction, 'outbound'),
              inArray(messages.status, [...QUEUED_OR_SCHEDULED_STATUSES]),
              gte(messages.createdAt, rangeStart),
              lt(messages.createdAt, rangeEndExclusive),
              isNull(messages.deletedAt),
            )!,
          ),
          ctx.db.messages.count(
            and(
              eq(messages.direction, 'outbound'),
              inArray(messages.status, [...OUTBOUND_SENT_STATUSES]),
              gte(sentDate, rangeStart),
              lt(sentDate, rangeEndExclusive),
              isNull(messages.deletedAt),
            )!,
          ),
          ctx.db.messages.count(
            and(
              eq(messages.direction, 'outbound'),
              inArray(messages.status, [...FAILED_SUPPRESSED_STATUSES]),
              gte(messages.createdAt, rangeStart),
              lt(messages.createdAt, rangeEndExclusive),
              isNull(messages.deletedAt),
            )!,
          ),
          ctx.db.inquiries.count(
            and(
              inArray(inquiries.status, [...TRIAGED_INQUIRY_STATUSES]),
              gte(inquiries.createdAt, rangeStart),
              lt(inquiries.createdAt, rangeEndExclusive),
              isNull(inquiries.deletedAt),
            )!,
          ),
          fetchAll(({ limit, offset }) =>
            ctx.db.messages.findMany({
              where: and(
                eq(messages.direction, 'outbound'),
                inArray(messages.status, [...OUTBOUND_SENT_STATUSES]),
                gte(sentDate, rangeStart),
                lt(sentDate, rangeEndExclusive),
                isNull(messages.deletedAt),
              )!,
              limit,
              offset,
            }),
          ),
          fetchAll(({ limit, offset }) =>
            ctx.db.messages.findMany({
              where: and(
                eq(messages.direction, 'inbound'),
                gte(messages.receivedAt, rangeStart),
                lt(messages.receivedAt, rangeEndExclusive),
                isNull(messages.deletedAt),
              )!,
              limit,
              offset,
            }),
          ),
          fetchAll(({ limit, offset }) =>
            ctx.db.inquiries.findMany({
              where: and(
                gte(inquiries.createdAt, rangeStart),
                lt(inquiries.createdAt, rangeEndExclusive),
                isNull(inquiries.deletedAt),
              )!,
              limit,
              offset,
            }),
          ),
          Promise.all(
            LEAD_STAGES.map(async (stage) => ({
              stage,
              count: await ctx.db.leads.count(and(eq(leads.stage, stage), isNull(leads.deletedAt))!),
            })),
          ),
          Promise.all(
            TASK_STATUSES.map(async (status) => ({
              status,
              count: await ctx.db.followUpTasks.count(
                and(eq(followUpTasks.status, status), isNull(followUpTasks.deletedAt))!,
              ),
            })),
          ),
        ])

      const timeseries = buildSeries(rangeStart, rangeDays)
      const pointByDate = new Map(timeseries.map((d) => [d.date, d]))

      for (const row of outboundRows) {
        const key = toDateKey(row.sentAt ?? row.createdAt)
        const point = pointByDate.get(key)
        if (point) point.outboundSent += 1
      }
      for (const row of inboundRows) {
        const key = toDateKey(row.receivedAt ?? row.createdAt)
        const point = pointByDate.get(key)
        if (point) point.inboundReceived += 1
      }
      for (const row of inquiryRows) {
        const key = toDateKey(row.createdAt)
        const point = pointByDate.get(key)
        if (point) point.inquiriesCreated += 1
      }

      const inquiryIntentCounts = new Map<(typeof INQUIRY_INTENTS)[number], number>()
      for (const intent of INQUIRY_INTENTS) inquiryIntentCounts.set(intent, 0)
      for (const row of inquiryRows) {
        inquiryIntentCounts.set(row.intent, (inquiryIntentCounts.get(row.intent) ?? 0) + 1)
      }
      const inquiryIntentBreakdown = INQUIRY_INTENTS.map((intent) => ({
        intent,
        count: inquiryIntentCounts.get(intent) ?? 0,
      })).filter((x) => x.count > 0)

      const outboundSent = outboundRows.length
      const inboundInquiries = inquiryRows.length
      const replyRate = outboundSent > 0 ? inboundInquiries / outboundSent : 0

      return {
        rangeDays,
        from: rangeStart.toISOString(),
        to: addUtcDays(rangeEndExclusive, -1).toISOString(),
        kpis: {
          leadsAdded,
          outboundSent,
          inboundInquiries,
          openFollowUps,
          replyRate,
        },
        timeseries,
        outreachFunnel: {
          pendingApproval,
          queuedOrScheduled,
          sentOrDelivered,
          bouncedFailedSuppressed,
          inquiriesTriaged,
        },
        inquiryIntentBreakdown,
        leadStageBreakdown: leadStageBreakdown.filter((x) => x.count > 0),
        followUpStatusBreakdown: followUpStatusBreakdown.filter((x) => x.count > 0),
      }
    })
  })
}
