"use client"

import { useMemo, useState } from "react"

import { formatCurrency, formatNumber } from "@/lib/format"

type SimpleBarChartProps = {
  title: string
  values: number[]
  labels?: string[]
}

export function SimpleBarChart({ title, values, labels }: SimpleBarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const bars = useMemo(() => {
    const max = Math.max(...values.map((value) => Math.abs(value)), 1)
    return values.map((value, index) => ({
      index,
      label: labels?.[index] ?? String(index + 1),
      value,
      pct: Math.max(4, (Math.abs(value) / max) * 100),
    }))
  }, [labels, values])

  return (
    <section className="self-start rounded-3xl border border-border bg-card p-6 text-card-foreground">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <div className="mt-4 space-y-4">
        {bars.map((bar) => (
          <div
            key={`${bar.label}-${bar.index}`}
            className="relative"
            onMouseEnter={() => setActiveIndex(bar.index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Periodo {bar.label}</span>
              <span>{formatNumber.format(bar.value)}</span>
            </div>
            <div className="h-5 rounded-full bg-muted/70">
              <div
                className={`h-5 rounded-full transition-all ${bar.value >= 0 ? "bg-gradient-to-r from-sky-500 to-blue-600" : "bg-gradient-to-r from-rose-500 to-red-600"}`}
                style={{ width: `${bar.pct}%` }}
              />
            </div>
            {activeIndex === bar.index ? (
              <div className="pointer-events-none absolute right-0 top-0 rounded-xl border border-border/70 bg-background/95 px-2 py-1 text-[10px] shadow-sm">
                {formatCurrency.format(bar.value)}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
