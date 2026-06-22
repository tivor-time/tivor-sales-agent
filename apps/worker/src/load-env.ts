/**
 * Load the monorepo-root .env into process.env BEFORE any module that reads env.
 *
 * The worker runs with its cwd in apps/worker, so — like Next.js in apps/web —
 * nothing else loads the single root .env. This MUST be the first import in
 * src/index.ts so process.env is populated before @tradepilot/shared/env (and
 * the Inngest client) evaluate. Never overrides a var already in the env.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

try {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
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
  // No root .env (zero-secret boot) — graceful degradation handles it.
}
