/** Jaro-Winkler similarity in [0, 1]. */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1
  if (!a.length || !b.length) return 0
  const m = Math.floor(Math.max(a.length, b.length) / 2) - 1
  const aMatch = new Array(a.length).fill(false)
  const bMatch = new Array(b.length).fill(false)
  let matches = 0
  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - m)
    const hi = Math.min(i + m + 1, b.length)
    for (let j = lo; j < hi; j++) {
      if (!bMatch[j] && a[i] === b[j]) {
        aMatch[i] = true
        bMatch[j] = true
        matches++
        break
      }
    }
  }
  if (!matches) return 0
  let t = 0
  let k = 0
  for (let i = 0; i < a.length; i++) {
    if (!aMatch[i]) continue
    while (!bMatch[k]) k++
    if (a[i] !== b[k]) t++
    k++
  }
  t /= 2
  const jaro = (matches / a.length + matches / b.length + (matches - t) / matches) / 3
  let prefix = 0
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++
    else break
  }
  return jaro + prefix * 0.1 * (1 - jaro)
}

/** Token-set Jaro-Winkler: also compares sorted/deduped token sets so reordered
 * tokens ("agro sri durga" vs "sri durga agro") still match. Takes the max. */
export function nameMatchScore(aNorm: string, bNorm: string): number {
  if (!aNorm || !bNorm) return 0
  const set = (s: string) => [...new Set(s.split(' ').filter(Boolean))].sort().join(' ')
  return Math.max(jaroWinkler(aNorm, bNorm), jaroWinkler(set(aNorm), set(bNorm)))
}

export const DEDUPE_MERGE_THRESHOLD = 0.9
export const DEDUPE_REVIEW_THRESHOLD = 0.82
