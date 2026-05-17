type CashflowDiagramProps = {
  flows: number[]
}

function compactCurrency(value: number) {
  const absolute = Math.abs(value)
  const sign = value < 0 ? "-" : ""
  if (absolute >= 1_000_000) return `${sign}$${(absolute / 1_000_000).toFixed(2)}M`
  if (absolute >= 1_000) return `${sign}$${(absolute / 1_000).toFixed(1)}k`
  return `${sign}$${absolute.toFixed(0)}`
}

export function CashflowDiagram({ flows }: CashflowDiagramProps) {
  const width = 1100
  const height = 460
  const axisY = height / 2
  const left = 60
  const right = width - 60
  const maxPeriod = Math.max(flows.length - 1, 1)
  const scaleX = (index: number) => left + (index / maxPeriod) * (right - left)
  const maxAbs = Math.max(...flows.map((flow) => Math.abs(flow)), 1)
  const scaleLen = (value: number) => 24 + (Math.abs(value) / maxAbs) * 72

  return (
    <section className="self-start rounded-3xl border border-border/60 bg-card p-6">
      <h3 className="text-base font-semibold text-foreground">Diagrama de flujo de caja</h3>
      <p className="mt-1 text-xs text-muted-foreground">Visualiza ingresos y egresos por periodo.</p>

      <div className="mt-4 rounded-2xl border border-border/60 bg-muted/30 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[28rem] w-full" role="img" aria-label="Diagrama de flujo de caja">
          <line x1={left} x2={right} y1={axisY} y2={axisY} stroke="#64748b" strokeWidth="2" opacity="0.6" />

          {flows.map((flow, index) => {
            const x = scaleX(index)
            const up = flow >= 0
            const len = scaleLen(flow)
            const endY = up ? axisY - len : axisY + len
            const color = up ? "#16a34a" : "#dc2626"
            return (
              <g key={`flow-${index}`}>
                <line x1={x} x2={x} y1={axisY} y2={endY} stroke={color} strokeWidth="4" />
                <path
                  d={up ? `M${x} ${endY - 2} l-8 12 h16 z` : `M${x} ${endY + 2} l-8 -12 h16 z`}
                  fill={color}
                />
                <text x={x} y={axisY + 22} textAnchor="middle" fontSize="10" fill="#94a3b8">
                  {index}
                </text>
                <text
                  x={x}
                  y={up ? endY - 12 : endY + 22}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill={color}
                >
                  {compactCurrency(flow)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}
