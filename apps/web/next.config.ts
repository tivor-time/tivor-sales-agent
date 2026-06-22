import type { NextConfig } from 'next'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

/**
 * Monorepo env loader. `next dev` runs with its cwd in apps/web, so Next only
 * loads apps/web/.env*. This project keeps a single .env at the repo root
 * (see .env.example), so load it here — without overriding anything already
 * present in the environment (OS vars / inline overrides win).
 */
function loadRootEnv(): void {
  try {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
    for (const raw of readFileSync(resolve(root, '.env'), 'utf8').split(/\r?\n/)) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq === -1) continue
      const key = line.slice(0, eq).trim()
      const value = line.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, '$2')
      if (key && value && !(key in process.env)) process.env[key] = value
    }
  } catch {
    // No root .env (zero-secret demo) — graceful degradation handles it.
  }
}
loadRootEnv()

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Internal workspace packages ship TS source; let Next transpile them.
  transpilePackages: ['@tradepilot/db', '@tradepilot/shared'],
  // pino + pg are server-only; keep them out of the client/edge bundle. inngest
  // pulls in heavy OpenTelemetry deps — externalize so Next doesn't bundle it.
  serverExternalPackages: ['pino', 'pg', 'inngest'],
}

export default nextConfig
