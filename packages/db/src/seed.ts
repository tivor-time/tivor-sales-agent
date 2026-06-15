/**
 * Idempotent seed for the reference tenant: Sri Durga Agro Exports (SDAE), a
 * gherkin/pickled-vegetable exporter selling to DE/ES/FR/PL. Run with:
 *   pnpm db:seed   (requires DATABASE_URL + applied migrations)
 *
 * Uses the raw pool directly — legitimate here because this script lives inside
 * the db package and seeds across the tenant boundary intentionally.
 */
import { getDb, closeDb } from './client/pool'
import { withTenantTransaction } from './client/rls'
import { tenants, users, memberships, catalogItems } from './schema'
import { logger } from '@tradepilot/shared/logger'

const SEED_ORG = 'org_sdae_seed'
const SEED_USER = 'user_sdae_seed'

async function main(): Promise<void> {
  const db = getDb()

  const [tenant] = await db
    .insert(tenants)
    .values({
      clerkOrgId: SEED_ORG,
      name: 'Sri Durga Agro Exports',
      slug: 'sri-durga-agro-exports',
      defaultLanguage: 'en',
      targetMarkets: ['DE', 'ES', 'FR', 'PL'],
      companyProfile: {
        legalName: 'Sri Durga Agro Exports',
        website: 'https://www.sridurgaagro.com',
        certifications: ['HACCP', 'Kosher', 'FDA', 'FSSAI'],
        about:
          'B2B exporter of gherkins and pickled vegetables (Grade 40/60, brine & vinegar) from India to EU markets.',
      },
    })
    .onConflictDoUpdate({
      target: tenants.clerkOrgId,
      set: { name: 'Sri Durga Agro Exports', updatedAt: new Date() },
    })
    .returning({ id: tenants.id })

  const tenantId = tenant!.id

  const [user] = await db
    .insert(users)
    .values({
      clerkUserId: SEED_USER,
      email: 'info@tivor.us',
      firstName: 'SDAE',
      lastName: 'Owner',
    })
    .onConflictDoUpdate({ target: users.clerkUserId, set: { updatedAt: new Date() } })
    .returning({ id: users.id })

  // memberships + catalog_items are tenant-scoped (RLS). Set the GUC for writes.
  await withTenantTransaction(tenantId, (tx) =>
    tx
      .insert(memberships)
      .values({ tenantId, userId: user!.id, role: 'owner' })
      .onConflictDoUpdate({
        target: [memberships.tenantId, memberships.userId],
        set: { role: 'owner', updatedAt: new Date() },
      }),
  )

  const items = [
    {
      sku: 'GHK-40-BRINE',
      name: 'Gherkins Grade 40 in Brine',
      category: 'gherkins',
      grade: '40',
      packaging: 'brine',
      hsCode: '200110',
      certifications: ['HACCP', 'Kosher', 'FDA', 'FSSAI'],
      incoterms: ['FOB', 'CIF'],
    },
    {
      sku: 'GHK-60-BRINE',
      name: 'Gherkins Grade 60 in Brine',
      category: 'gherkins',
      grade: '60',
      packaging: 'brine',
      hsCode: '200110',
      certifications: ['HACCP', 'Kosher', 'FDA', 'FSSAI'],
      incoterms: ['FOB', 'CIF'],
    },
    {
      sku: 'GHK-40-VINEGAR',
      name: 'Gherkins Grade 40 in Vinegar',
      category: 'gherkins',
      grade: '40',
      packaging: 'vinegar',
      hsCode: '200110',
      certifications: ['HACCP', 'Kosher', 'FDA', 'FSSAI'],
      incoterms: ['FOB', 'CIF'],
    },
    {
      sku: 'GHK-60-VINEGAR',
      name: 'Gherkins Grade 60 in Vinegar',
      category: 'gherkins',
      grade: '60',
      packaging: 'vinegar',
      hsCode: '200110',
      certifications: ['HACCP', 'Kosher', 'FDA', 'FSSAI'],
      incoterms: ['FOB', 'CIF'],
    },
  ]

  await withTenantTransaction(tenantId, async (tx) => {
    for (const item of items) {
      await tx
        .insert(catalogItems)
        .values({ tenantId, ...item })
        .onConflictDoUpdate({
          target: [catalogItems.tenantId, catalogItems.sku],
          set: { name: item.name, updatedAt: new Date() },
        })
    }
  })

  logger.info(
    { tenantId, items: items.length },
    'Seeded reference tenant: Sri Durga Agro Exports',
  )
}

main()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch(async (err) => {
    logger.error({ err }, 'Seed failed')
    await closeDb()
    process.exit(1)
  })
