/**
 * @tradepilot/shared/inbound - pure inbound-classification types + a zero-AI
 * heuristic fallback. Framework-agnostic (no SDK, no server-only); the AI
 * provider adapters live in the worker.
 */
export * from './types'
export { classifyInboundHeuristic } from './heuristic'
