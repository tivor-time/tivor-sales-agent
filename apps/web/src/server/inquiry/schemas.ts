import { z } from 'zod'

export const INQUIRY_INTENTS = [
  'price_request',
  'sample_request',
  'spec_request',
  'moq_request',
  'certification_request',
  'logistics_request',
  'partnership',
  'complaint',
  'unsubscribe',
  'out_of_office',
  'not_interested',
  'other',
] as const
export const INQUIRY_STATUSES = ['open', 'triaged', 'responded', 'won', 'lost', 'ignored'] as const

export type InquiryIntent = (typeof INQUIRY_INTENTS)[number]
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number]

const intentSchema = z.enum(INQUIRY_INTENTS)
const statusSchema = z.enum(INQUIRY_STATUSES)

export const listInquiriesSchema = z.object({
  filters: z
    .object({
      intent: z.array(intentSchema).default([]),
      status: z.array(statusSchema).default([]),
      search: z.string().trim().max(200).optional(),
    })
    .default({}),
  pagination: z
    .object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(25),
    })
    .default({}),
})
export type ListInquiriesInput = z.infer<typeof listInquiriesSchema>

export const inquiryIdSchema = z.object({ id: z.string().uuid() })
export const setInquiryStatusSchema = z.object({ id: z.string().uuid(), status: statusSchema })
