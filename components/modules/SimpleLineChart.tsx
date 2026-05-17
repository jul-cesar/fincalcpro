"use client"

import { useMemo, useState } from "react"

import { formatCurrency, formatNumber } from "@/lib/format"

type SimpleLineChartProps = {
  title: string
  values: number[]
}

export function SimpleLineChart({ title, values }: SimpleLineChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const chartData = useMemo(() => {
    if (!values.length) return ""
    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)
    const width = 560
    const height = 200
    const padding = 16
    const labelPadding = 36

    const scaleX = (index: number) =>
      labelPadding + (index / Math.max(1, values.length - 1)) * (width - labelPadding - padding)
    const scaleY = (value: number) => {
      if (maxValue === minValue) return height / 2
      const ratio = (value - minValue) / (maxValue - minValue)
      return height - padding - ratio * (height - padding * 2)
    }

    const coordinates = values.map((value, index) => ({
      x: scaleX(index),
      y: scaleY(value),
      value,
      index,
    }))
    const points = coordinates.map((point) => `${point.x},${point.y}`).join(" ")
    return {
      coordinates,
      points,
      minValue,
      maxValue,
      width,
      height,
      padding,
      labelPadding,
      scaleX,
      scaleY,
    }
  }, [values])

  const latest = values.at(-1) ?? 0

  return (
    <section className="self-start rounded-3xl border border-border bg-card p-6 text-card-foreground">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{formatCurrency.format(latest)}</span>
      </div>
      <div className="mt-4 rounded-2xl border border-border/60 bg-muted/40 p-2">
        <div className="relative">
          <svg viewBox="0 0 560 200" className="h-[24rem] w-full">
            <defs>
              <linearGradient id="line-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.05" />
              </linearGradient>
              <filter id="point-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {chartData ? (
              <>
              <line
                x1={chartData.labelPadding}
                x2={chartData.width - chartData.padding}
                y1={chartData.padding}
                y2={chartData.padding}
                stroke="#e2e8f0"
              />
              <line
                x1={chartData.labelPadding}
                x2={chartData.width - chartData.padding}
                y1={chartData.height / 2}
                y2={chartData.height / 2}
                stroke="#e2e8f0"
              />
              <line
                x1={chartData.labelPadding}
                x2={chartData.width - chartData.padding}
                y1={chartData.height - chartData.padding}
                y2={chartData.height - chartData.padding}
                stroke="#e2e8f0"
              />
              <polyline
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={chartData.points}
              />
              <polygon
                points={`${chartData.points} ${chartData.width - chartData.padding},${chartData.height - chartData.padding} ${chartData.labelPadding},${chartData.height - chartData.padding}`}
                fill="url(#line-gradient)"
              />
              {chartData.coordinates.map((point) => (
                <g key={`point-${point.index}`}>
                  <circle cx={point.x} cy={point.y} r={3.5} fill="#2563eb" filter="url(#point-glow)" />
                  <circle cx={point.x} cy={point.y} r={9} fill="#2563eb" opacity={0.12} />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={14}
                    fill="transparent"
                    onMouseEnter={() => setActiveIndex(point.index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  />
                </g>
              ))}
              <text
                x={chartData.labelPadding - 6}
                y={chartData.padding + 4}
                textAnchor="end"
                fontSize="10"
                fill="#64748b"
              >
                {formatNumber.format(chartData.maxValue)}
              </text>
              <text
                x={chartData.labelPadding - 6}
                y={chartData.height / 2 + 4}
                textAnchor="end"
                fontSize="10"
                fill="#64748b"
              >
                {formatNumber.format((chartData.maxValue + chartData.minValue) / 2)}
              </text>
              <text
                x={chartData.labelPadding - 6}
                y={chartData.height - chartData.padding + 4}
                textAnchor="end"
                fontSize="10"
                fill="#64748b"
              >
                {formatNumber.format(chartData.minValue)}
              </text>
              <text
                x={chartData.labelPadding}
                y={chartData.height - 2}
                textAnchor="start"
                fontSize="10"
                fill="#64748b"
              >
                0
              </text>
              <text
                x={chartData.width - chartData.padding}
                y={chartData.height - 2}
                textAnchor="end"
                fontSize="10"
                fill="#64748b"
              >
                {values.length - 1}
              </text>
              {chartData.coordinates.map((point) => (
                <text
                  key={`label-${point.index}`}
                  x={point.x}
                  y={chartData.height - 2}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#94a3b8"
                >
                  {point.index}
                </text>
              ))}
            </>
          ) : null}
          </svg>
          {chartData && activeIndex !== null ? (
            <div className="pointer-events-none absolute inset-0">
              {chartData.coordinates
                .filter((point) => point.index === activeIndex)
                .map((point) => (
                  <div
                    key={`tooltip-${point.index}`}
                    className="absolute"
                    style={{
                      left: `calc(${(point.x / chartData.width) * 100}% - 1rem)`,
                      top: `calc(${(point.y / chartData.height) * 100}% - 2.6rem)`,
                    }}
                  >
                    <div className="rounded-xl border border-border/70 bg-background/95 px-2 py-1 text-[10px] font-medium text-foreground shadow-sm">
                      {`Periodo ${point.index}`}
                    </div>
                    <div className="mt-1 rounded-xl border border-border/70 bg-white/95 px-2 py-1 text-[10px] text-muted-foreground shadow-sm">
                      {formatCurrency.format(point.value)}
                    </div>
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
