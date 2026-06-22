/**
 * Worker-only runtime config. Everything else comes from @tradepilot/shared/env
 * (the typed, never-throwing env loader). PORT is read directly because it is
 * not part of the shared schema.
 */
const parsedPort = Number(process.env.PORT)
export const PORT = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3030
export const INNGEST_SERVE_PATH = '/api/inngest'
