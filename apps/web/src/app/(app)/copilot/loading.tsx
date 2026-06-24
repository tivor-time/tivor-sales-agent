/**
 * Copilot is a full-bleed client chat with no server data to wait on, so a blank
 * full-height surface avoids any mismatched skeleton flash on navigation.
 */
export default function Loading() {
  return <div className="h-full bg-background" />
}
