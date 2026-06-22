import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'

/**
 * The web app hosts ZERO Inngest functions — the worker (apps/worker) owns and
 * runs them. This endpoint exists so the Inngest dev server / cloud can
 * introspect the web client and so the web app is a registered event-send
 * origin. Functions are served from the worker's own /api/inngest endpoint.
 */
export const { GET, POST, PUT } = serve({ client: inngest, functions: [] })
