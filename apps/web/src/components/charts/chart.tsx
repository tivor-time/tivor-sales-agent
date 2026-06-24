'use client'

/**
 * Shared, theme-aware chart primitives for Recharts.
 *
 * Everything references CSS variables (`hsl(var(--chart-n))`, `--border`,
 * `--muted-foreground`) so charts adapt to light/dark automatically — no
 * hardcoded hex colors. The tooltip and legend are custom HTML (Tailwind),
 * replacing Recharts' default white box + wrapping rainbow legend.
 *
 * Usage:
 *   import { CHART_COLORS, ChartTooltip, ChartLegend, axisProps, gridProps }
 *     from '@/components/charts/chart'
 *
 *   <CartesianGrid {...gridProps} />
 *   <XAxis dataKey="date" {...axisProps} />
 *   <Tooltip cursor={tooltipCursor} content={<ChartTooltip valueFormatter={fmt} />} />
 *   <Legend content={<ChartLegend />} />
 *   <Line stroke={CHART_COLORS[0]} ... />
 */

import * as React from 'react'

/** Ordered, theme-aware series palette. Index into it for multi-series charts. */
export const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
] as const

/** Pick a palette color by index (wraps around). */
export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]!
}

const formatNumber = (v: unknown): string =>
  typeof v === 'number' ? new Intl.NumberFormat().format(v) : String(v ?? '')

/** Spread onto every `<XAxis>` / `<YAxis>`: muted ticks, no harsh axis/tick lines. */
export const axisProps = {
  stroke: 'hsl(var(--border))',
  tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
} as const

/** Spread onto `<CartesianGrid>`: subtle horizontal-only guide lines. */
export const gridProps = {
  stroke: 'hsl(var(--border))',
  strokeDasharray: '4 4',
  vertical: false,
} as const

/** Soft hover band/line for `<Tooltip cursor={...} />`. */
export const tooltipCursor = {
  fill: 'hsl(var(--muted-foreground) / 0.10)',
  stroke: 'hsl(var(--border))',
} as const

interface TooltipItem {
  name?: string | number
  value?: number | string
  color?: string
  dataKey?: string | number
  payload?: Record<string, unknown>
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipItem[]
  label?: string | number
  hideLabel?: boolean
  labelFormatter?: (label: unknown) => React.ReactNode
  valueFormatter?: (value: number | string) => React.ReactNode
}

/** Themed tooltip — pass as `<Tooltip content={<ChartTooltip ... />} />`. */
export function ChartTooltip({
  active,
  payload,
  label,
  hideLabel,
  labelFormatter,
  valueFormatter = formatNumber,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const showLabel = !hideLabel && label !== undefined && label !== ''
  return (
    <div className="min-w-[8rem] rounded-lg border bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
      {showLabel ? (
        <div className="mb-1.5 border-b border-border/60 pb-1.5 font-medium text-foreground">
          {labelFormatter ? labelFormatter(label) : String(label)}
        </div>
      ) : null}
      <div className="space-y-1.5">
        {payload.map((item, i) => (
          <div key={`${item.dataKey ?? item.name ?? i}`} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">{item.name}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums text-foreground">
              {valueFormatter(item.value ?? '')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface LegendItem {
  value?: string | number
  color?: string
  type?: string
}

interface ChartLegendProps {
  payload?: LegendItem[]
}

/** Compact, centered legend with rounded swatches — `<Legend content={<ChartLegend />} />`. */
export function ChartLegend({ payload }: ChartLegendProps) {
  if (!payload?.length) return null
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-3 text-xs">
      {payload.map((item, i) => (
        <li key={`${item.value ?? i}`} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-[3px]"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted-foreground">{item.value}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Renders `<linearGradient>` defs for area/line fills. Drop inside a chart and
 * reference via `fill="url(#chart-grad-0)"`. Vertical fade from color → transparent.
 */
export function ChartGradients({ count = CHART_COLORS.length }: { count?: number }) {
  return (
    <defs>
      {Array.from({ length: count }).map((_, i) => (
        <linearGradient key={i} id={`chart-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={chartColor(i)} stopOpacity={0.28} />
          <stop offset="100%" stopColor={chartColor(i)} stopOpacity={0.02} />
        </linearGradient>
      ))}
    </defs>
  )
}
