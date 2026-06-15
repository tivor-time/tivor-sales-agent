-- Defense-in-depth: Postgres Row-Level Security on every tenant-scoped table.
--
-- The application-layer DAL is the primary isolation mechanism; these policies
-- are a DB-level backstop so that even a raw query / migration / backfill cannot
-- cross tenants. They rely on `app.tenant_id` being set per transaction via
-- `set_config('app.tenant_id', $1, true)` (see withTenantTransaction).
--
-- IMPORTANT: RLS only constrains a role that lacks BYPASSRLS and is not the
-- table owner — hence FORCE ROW LEVEL SECURITY (covers the owner case). In
-- production, connect the app via a dedicated non-superuser, non-BYPASSRLS role.
--
-- When the GUC is unset, current_setting('app.tenant_id', true) returns NULL,
-- NULL::uuid makes the predicate false -> fail closed (no rows visible/writable).

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'memberships',
    'catalog_items',
    'leads',
    'contacts',
    'lead_provenance',
    'email_identities',
    'campaigns',
    'sequences',
    'sequence_steps',
    'messages',
    'approvals',
    'inquiries',
    'listings',
    'listing_versions',
    'samples',
    'follow_up_tasks',
    'market_briefs',
    'suppression_entries',
    'audit_events',
    'usage_records',
    'subscriptions'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      || 'USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) '
      || 'WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid);',
      t
    );
  END LOOP;
END
$$;
