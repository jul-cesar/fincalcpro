type AnnuityDiagramProps = {
  payment: number
  futureValue: number
  periods: number
  timing: "end" | "beginning"
}

function compactCurrency(value: number) {
  const absolute = Math.abs(value)
  const sign = value < 0 ? "-" : ""
  if (absolute >= 1_000_000) return `${sign}$${(absolute / 1_000_000).toFixed(2)}M`
  if (absolute >= 1_000) return `${sign}$${(absolute / 1_000).toFixed(1)}k`
  return `${sign}$${absolute.toFixed(0)}`
}

export function AnnuityDiagram({ payment, futureValue, periods, timing }: AnnuityDiagramProps) {
  const width = 1100
  const height = 460
  const axisY = 160
  const shown = Math.max(1, Math.min(periods || 1, 12))
  const left = 44
  const right = width - 44
  const scaleX = (i: number) => left + (i / shown) * (right - left)
  const depositStart = timing === "beginning" ? 0 : 1
  const depositEnd = timing === "beginning" ? shown - 1 : shown

  return (
    <section className="self-start rounded-3xl border border-border/60 bg-card p-6">
      <h3 className="text-base font-semibold text-foreground">Diagrama de ahorro periodico</h3>
      <p className="mt-1 text-xs text-muted-foreground">Vista resumida de hasta 12 periodos.</p>

      <div className="mt-4 rounded-2xl border border-border/60 bg-muted/30 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[28rem] w-full" role="img" aria-label="Diagrama de anualidad">
          <line x1={left} x2={right} y1={axisY} y2={axisY} stroke="#64748b" strokeWidth="2" opacity="0.6" />

          {Array.from({ length: shown + 1 }, (_, index) => {
            const x = scaleX(index)
            const label = index === shown && periods > shown ? periods : index
            return (
              <g key={`tick-${index}`}>
                <line x1={x} x2={x} y1={axisY - 5} y2={axisY + 5} stroke="#94a3b8" strokeWidth="1.5" />
                <text x={x} y={axisY + 20} textAnchor="middle" fontSize="10" fill="#94a3b8">
                  {label}
                </text>
              </g>
            )
          })}

          {Array.from({ length: Math.max(depositEnd - depositStart + 1, 0) }, (_, offset) => {
            const period = depositStart + offset
            const x = scaleX(period)
            return (
              <g key={`deposit-${period}`}>
                <line x1={x} x2={x} y1={axisY + 62} y2={axisY + 16} stroke="#0ea5e9" strokeWidth="4" />
                <path d={`M${x} ${axisY + 12} l-7 11 h14 z`} fill="#0ea5e9" />
              </g>
            )
          })}

          <line x1={right} x2={right} y1={axisY - 74} y2={axisY - 10} stroke="#2563eb" strokeWidth="4" />
          <path d={`M${right} ${axisY - 78} l-8 12 h16 z`} fill="#2563eb" />

          <text x={right - 8} y={axisY - 90} textAnchor="end" fontSize="11" fontWeight="600" fill="#2563eb">
            VF = {compactCurrency(futureValue)}
          </text>
          <text x={left + 100} y={axisY + 86} textAnchor="middle" fontSize="11" fontWeight="600" fill="#0ea5e9">
            A = {compactCurrency(payment)}
          </text>
        </svg>
      </div>
    </section>
  )
}
