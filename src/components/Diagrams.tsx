import { scaleLinear } from "d3";
import { compactCurrency } from "../lib/format";

export function CashflowDiagram({ flows }: { flows: number[] }) {
  const width = 940;
  const height = 330;
  const axisY = height / 2;
  const x = scaleLinear()
    .domain([0, Math.max(flows.length - 1, 1)])
    .range([70, width - 70]);
  const max = Math.max(...flows.map(Math.abs), 1);
  const y = scaleLinear().domain([0, max]).range([46, 114]);

  return (
    <section className="diagram-panel" data-tour="cashflow-diagram">
      <h3>Diagrama de flujo de caja</h3>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Diagrama de flujo de caja">
        <line x1="70" x2={width - 70} y1={axisY} y2={axisY} className="axis" />
        {flows.map((flow, index) => {
          const up = flow >= 0;
          const px = x(index);
          const length = y(Math.abs(flow));
          const endY = up ? axisY - length : axisY + length;
          const color = up ? "var(--positive)" : "var(--negative)";
          return (
            <g key={index}>
              <line x1={px} x2={px} y1={axisY} y2={endY} stroke={color} strokeWidth="5" />
              <path
                d={up ? `M${px} ${endY - 2} l-9 14 h18 z` : `M${px} ${endY + 2} l-9 -14 h18 z`}
                fill={color}
              />
              <text x={px} y={axisY + 28} textAnchor="middle" className="period-label">
                {index}
              </text>
              <text x={px} y={up ? endY - 14 : endY + 30} textAnchor="middle" fill={color} className="money-label">
                {compactCurrency(flow)}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

export function AnnuityDiagram({
  payment,
  futureValue,
  periods,
  timing
}: {
  payment: number;
  futureValue: number;
  periods: number;
  timing: "end" | "beginning";
}) {
  const width = 940;
  const height = 330;
  const axisY = 190;
  const shown = Math.min(periods, 12);
  const x = scaleLinear().domain([0, shown]).range([70, width - 70]);
  const depositStart = timing === "beginning" ? 0 : 1;
  const depositEnd = timing === "beginning" ? shown - 1 : shown;

  return (
    <section className="diagram-panel" data-tour="annuity-diagram">
      <h3>Diagrama de ahorro periodico</h3>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Diagrama de anualidad">
        <line x1="70" x2={width - 70} y1={axisY} y2={axisY} className="axis" />
        {Array.from({ length: shown + 1 }, (_, index) => {
          const label = index === shown && periods > shown ? periods : index;
          return (
            <text
              key={index}
              x={index === shown ? x(index) - 20 : x(index)}
              y={axisY - 16}
              textAnchor="middle"
              className="period-label"
            >
              {label}
            </text>
          );
        })}
        {Array.from({ length: Math.max(depositEnd - depositStart + 1, 0) }, (_, offset) => {
          const period = depositStart + offset;
          const px = x(period);
          return (
            <g key={period}>
              <line x1={px} x2={px} y1={axisY + 84} y2={axisY + 30} stroke="var(--brand-2)" strokeWidth="5" />
              <path d={`M${px} ${axisY + 28} l-9 14 h18 z`} fill="var(--brand-2)" />
            </g>
          );
        })}
        <line x1={width - 70} x2={width - 70} y1={axisY - 92} y2={axisY - 14} stroke="var(--brand)" strokeWidth="5" />
        <path d={`M${width - 70} ${axisY - 96} l-10 16 h20 z`} fill="var(--brand)" />
        <text x={width - 102} y={axisY - 112} textAnchor="middle" fill="var(--brand)" className="money-label">
          VF = {compactCurrency(futureValue)}
        </text>
        <text x={184} y={axisY + 116} textAnchor="middle" fill="var(--brand-2)" className="money-label">
          A = {compactCurrency(payment)}
        </text>
      </svg>
    </section>
  );
}
