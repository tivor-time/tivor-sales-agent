import { defineConfig } from 'drizzle-kit'

const url = process.env.DATABASE_URL ?? ''
// Hosted Postgres (Supabase, Neon) requires TLS; local Postgres does not.
const needsTls = /supabase\.|sslmode=require|\.pooler\./i.test(url)

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: needsTls ? { url, ssl: { rejectUnauthorized: false } } : { url },
  casing: 'snake_case',
  verbose: true,
  strict: true,
})
