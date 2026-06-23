import { schema } from '@tradepilot/db'

type InquiryRow = typeof schema.inquiries.$inferSelect
type MessageRow = typeof schema.messages.$inferSelect

export interface InquiryListDTO {
  id: string
  leadId: string | null
  leadCompany: string | null
  intent: InquiryRow['intent']
  status: InquiryRow['status']
  language: InquiryRow['language']
  subject: string
  snippet: string
  icpScore: number | null
  fromAddress: string | null
  receivedAt: string | null
  createdAt: string
}

export interface InquiryDetailDTO {
  inquiry: {
    id: string
    intent: InquiryRow['intent']
    status: InquiryRow['status']
    language: InquiryRow['language']
    budget: string | null
    authority: string | null
    need: string | null
    timeline: string | null
    icpScore: number | null
    requestedProducts: string[]
    extracted: Record<string, unknown>
    createdAt: string
  }
  message: {
    subject: string
    bodyText: string
    bodyHtml: string | null
    fromAddress: string | null
    toAddress: string | null
    threadId: string | null
    receivedAt: string | null
  } | null
  lead: { id: string; companyName: string } | null
}

/** List item — only a snippet of the body, never the full message. */
export function toInquiryListDTO(
  i: InquiryRow,
  message: MessageRow | null,
  leadCompany: string | null,
): InquiryListDTO {
  return {
    id: i.id,
    leadId: i.leadId,
    leadCompany,
    intent: i.intent,
    status: i.status,
    language: i.language,
    subject: message?.subject ?? '(no subject)',
    snippet: (message?.bodyText ?? '').trim().slice(0, 160),
    icpScore: i.icpScore,
    fromAddress: message?.fromAddress ?? null,
    receivedAt: message?.receivedAt?.toISOString() ?? null,
    createdAt: i.createdAt.toISOString(),
  }
}

export function toInquiryDetailDTO(
  i: InquiryRow,
  message: MessageRow | null,
  lead: { id: string; companyName: string } | null,
): InquiryDetailDTO {
  return {
    inquiry: {
      id: i.id,
      intent: i.intent,
      status: i.status,
      language: i.language,
      budget: i.budget,
      authority: i.authority,
      need: i.need,
      timeline: i.timeline,
      icpScore: i.icpScore,
      requestedProducts: i.requestedProducts ?? [],
      extracted: i.extracted ?? {},
      createdAt: i.createdAt.toISOString(),
    },
    message: message
      ? {
          subject: message.subject ?? '',
          bodyText: message.bodyText ?? '',
          bodyHtml: message.bodyHtml,
          fromAddress: message.fromAddress,
          toAddress: message.toAddress,
          threadId: message.threadId,
          receivedAt: message.receivedAt?.toISOString() ?? null,
        }
      : null,
    lead,
  }
}
