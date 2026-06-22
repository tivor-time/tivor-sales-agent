import './load-env' // MUST be first: populates process.env from the root .env.
import { createServer } from 'node:http'
import { flags } from '@tradepilot/shared/env'
import { isDbConfigured } from '@tradepilot/db'
import { inngestHandler } from './server'
import { PORT, INNGEST_SERVE_PATH } from './env'
import { log } from './lib/logger'

/**
 * Worker entrypoint. Always starts the HTTP server — it never throws on missing
 * secrets (graceful degradation). Routes:
 *   GET  /health            → liveness + degradation state
 *   *    /api/inngest        → the Inngest function endpoint
 */
const server = createServer((req, res) => {
  const url = req.url ?? '/'
  if (url === '/' || url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'worker',
        jobs: flags.isJobsEnabled,
        db: isDbConfigured(),
      }),
    )
    return
  }
  if (url.startsWith(INNGEST_SERVE_PATH)) {
    inngestHandler(req, res)
    return
  }
  res.writeHead(404, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ error: 'not found' }))
})

server.listen(PORT, () => {
  log.info(
    { port: PORT, path: INNGEST_SERVE_PATH, jobs: flags.isJobsEnabled, db: isDbConfigured() },
    'worker started',
  )
  if (!flags.isJobsEnabled) {
    log.warn('INNGEST keys absent — running in local dev mode (unsigned)')
  }
  if (!isDbConfigured()) {
    log.warn('DATABASE_URL absent — DB-backed handlers will no-op')
  }
})
