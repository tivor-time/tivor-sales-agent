import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Internal workspace packages ship TS source; let Next transpile them.
  transpilePackages: ['@tradepilot/db', '@tradepilot/shared'],
  // pino + pg are server-only; keep them out of the client/edge bundle.
  serverExternalPackages: ['pino', 'pg'],
}

export default nextConfig
