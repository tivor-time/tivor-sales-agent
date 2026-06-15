import { relations } from 'drizzle-orm'
import { tenants, users, memberships } from './tenant'
import { catalogItems } from './catalog'
import { leads, contacts, leadProvenance } from './lead'
import { emailIdentities } from './mailbox'
import { campaigns, sequences, sequenceSteps } from './campaign'
import { messages, inquiries } from './message'
import { listings, listingVersions, samples, followUpTasks } from './listing'
import { subscriptions } from './compliance'

export const tenantsRelations = relations(tenants, ({ many, one }) => ({
  memberships: many(memberships),
  catalogItems: many(catalogItems),
  leads: many(leads),
  emailIdentities: many(emailIdentities),
  campaigns: many(campaigns),
  subscription: one(subscriptions),
}))

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
}))

export const membershipsRelations = relations(memberships, ({ one }) => ({
  tenant: one(tenants, { fields: [memberships.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
}))

export const leadsRelations = relations(leads, ({ one, many }) => ({
  tenant: one(tenants, { fields: [leads.tenantId], references: [tenants.id] }),
  contacts: many(contacts),
  provenance: many(leadProvenance),
  messages: many(messages),
  inquiries: many(inquiries),
  samples: many(samples),
  followUpTasks: many(followUpTasks),
}))

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  tenant: one(tenants, { fields: [contacts.tenantId], references: [tenants.id] }),
  lead: one(leads, { fields: [contacts.leadId], references: [leads.id] }),
  messages: many(messages),
}))

export const leadProvenanceRelations = relations(leadProvenance, ({ one }) => ({
  lead: one(leads, { fields: [leadProvenance.leadId], references: [leads.id] }),
}))

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  tenant: one(tenants, { fields: [campaigns.tenantId], references: [tenants.id] }),
  emailIdentity: one(emailIdentities, {
    fields: [campaigns.emailIdentityId],
    references: [emailIdentities.id],
  }),
  sequences: many(sequences),
  messages: many(messages),
}))

export const sequencesRelations = relations(sequences, ({ one, many }) => ({
  campaign: one(campaigns, { fields: [sequences.campaignId], references: [campaigns.id] }),
  steps: many(sequenceSteps),
}))

export const sequenceStepsRelations = relations(sequenceSteps, ({ one }) => ({
  sequence: one(sequences, { fields: [sequenceSteps.sequenceId], references: [sequences.id] }),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  tenant: one(tenants, { fields: [messages.tenantId], references: [tenants.id] }),
  campaign: one(campaigns, { fields: [messages.campaignId], references: [campaigns.id] }),
  sequenceStep: one(sequenceSteps, {
    fields: [messages.sequenceStepId],
    references: [sequenceSteps.id],
  }),
  lead: one(leads, { fields: [messages.leadId], references: [leads.id] }),
  contact: one(contacts, { fields: [messages.contactId], references: [contacts.id] }),
  emailIdentity: one(emailIdentities, {
    fields: [messages.emailIdentityId],
    references: [emailIdentities.id],
  }),
}))

export const inquiriesRelations = relations(inquiries, ({ one }) => ({
  lead: one(leads, { fields: [inquiries.leadId], references: [leads.id] }),
  contact: one(contacts, { fields: [inquiries.contactId], references: [contacts.id] }),
  message: one(messages, { fields: [inquiries.messageId], references: [messages.id] }),
}))

export const listingsRelations = relations(listings, ({ one, many }) => ({
  tenant: one(tenants, { fields: [listings.tenantId], references: [tenants.id] }),
  catalogItem: one(catalogItems, {
    fields: [listings.catalogItemId],
    references: [catalogItems.id],
  }),
  versions: many(listingVersions),
}))

export const listingVersionsRelations = relations(listingVersions, ({ one }) => ({
  listing: one(listings, { fields: [listingVersions.listingId], references: [listings.id] }),
}))

export const samplesRelations = relations(samples, ({ one }) => ({
  lead: one(leads, { fields: [samples.leadId], references: [leads.id] }),
  catalogItem: one(catalogItems, {
    fields: [samples.catalogItemId],
    references: [catalogItems.id],
  }),
}))

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  tenant: one(tenants, { fields: [subscriptions.tenantId], references: [tenants.id] }),
}))
