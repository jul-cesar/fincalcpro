"use client"

import { useMemo, useRef, useState } from "react"

import { ExportExcelButton } from "@/components/modules/ExportExcelButton"
import { ExerciseHistoryControls } from "@/components/modules/ExerciseHistoryControls"
import { FormPanel } from "@/components/modules/FormPanel"
import { ModuleShell } from "@/components/modules/ModuleShell"
import { NumberField } from "@/components/modules/NumberField"
import { ResultPanel } from "@/components/modules/ResultPanel"
import { CashflowDiagram } from "@/components/modules/CashflowDiagram"
import { StepsPanel } from "@/components/modules/StepsPanel"
import { Table } from "@/components/modules/Table"
import { cashflowSeries, internalRateOfReturn, netPresentValue } from "@/lib/finance"
import { asPercent, formatCurrency, formatNumber } from "@/lib/format"

type FormState = {
  initial: string
  payment: string
  periods: string
  growth: string
  discountRate: string
}

export default function CashflowPage() {
  const formulasRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<FormState>({
    initial: "-10000000",
    payment: "3000000",
    periods: "5",
    growth: "4",
    discountRate: "12",
  })

  const initial = Number(state.initial || 0)
  const payment = Number(state.payment || 0)
  const periods = Number(state.periods || 0)
  const growth = Number(state.growth || 0)
  const discountRate = Number(state.discountRate || 0)

  const { flows, presentValues, npv, irr } = useMemo(() => {
    const flows = cashflowSeries(initial, payment, periods, growth)
    const discount = discountRate / 100
    const presentValues = flows.map((flow, index) => flow / Math.pow(1 + discount, index))
    const npv = netPresentValue(flows, discount)
    const irr = internalRateOfReturn(flows)
    return { flows, presentValues, npv, irr }
  }, [initial, payment, periods, growth, discountRate])

  const summary = [
    {
      label: "VPN",
      value: formatCurrency.format(npv),
      tone: npv >= 0 ? "positive" : "negative",
    },
    {
      label: "TIR aproximada",
      value: Number.isFinite(irr) ? asPercent(irr) : "No converge",
    },
    {
      label: "Periodos evaluados",
      value: String(flows.length - 1),
    },
  ]

  const steps = [
    "Genera los flujos proyectados con crecimiento por periodo.",
    "Descuenta cada flujo al valor presente con la tasa de oportunidad.",
    "Suma los valores presentes para obtener el VPN y estima la TIR.",
  ]

  const formulas = [
    String.raw`F_t = F_1 \cdot (1+g)^{t-1}`,
    String.raw`VPN = \sum_{t=0}^{n} \frac{F_t}{(1+i)^t}`,
    String.raw`g = ${formatNumber.format(growth / 100)},\ i = ${formatNumber.format(discountRate / 100)}`,
  ]

  const tableRows = flows.map((flow, index) => [
    index,
    formatCurrency.format(flow),
    formatCurrency.format(presentValues[index]),
  ])

  return (
    <ModuleShell
      title="Flujo de caja"
      description="Evalua flujos proyectados con crecimiento, VPN y TIR aproximada."
    >
      <div className="grid gap-5">
        <div className="grid items-stretch gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <FormPanel className="self-auto h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
                  Datos de entrada
                </p>
                <p className="text-sm font-semibold text-foreground">Completa los valores</p>
              </div>
              <span className="text-xs text-muted-foreground">Auto-calculo</span>
            </div>
            <ExerciseHistoryControls
              module="cashflow"
              exerciseType="projected_series"
              state={state}
              onApplyInput={setState}
              buildTitle={(values) => `Flujo de caja - inversion ${formatCurrency.format(Number(values.initial || 0))}`}
              modalTitle="Historial de flujo de caja"
            />
            <ExportExcelButton
              getPayload={() => ({
                fileName: `flujo-caja-${Date.now()}`,
                sheetName: "FlujoCaja",
                moduleTitle: "Flujo de caja",
                generatedAt: new Date().toLocaleString("es-CO"),
                inputs: [
                  { label: "Inversion inicial", value: state.initial },
                  { label: "Ingreso periodico", value: state.payment },
                  { label: "Periodos", value: state.periods },
                  { label: "Crecimiento por periodo (%)", value: state.growth },
                  { label: "Tasa de descuento (%)", value: state.discountRate },
                ],
                results: summary.map((item) => ({ label: item.label, value: item.value })),
                formulas,
                table: {
                  title: "Tabla de flujos",
                  headers: ["Periodo", "Flujo", "Valor presente"],
                  rows: tableRows,
                },
                imageElements: [formulasRef.current, chartRef.current, tableRef.current].filter(Boolean) as HTMLElement[],
              })}
            />
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              <NumberField
                label="Inversion inicial"
                value={state.initial}
                onChange={(value) => setState((current) => ({ ...current, initial: value }))}
              />
              <NumberField
                label="Ingreso periodico"
                value={state.payment}
                onChange={(value) => setState((current) => ({ ...current, payment: value }))}
              />
              <NumberField
                label="Periodos"
                value={state.periods}
                onChange={(value) => setState((current) => ({ ...current, periods: value }))}
              />
              <NumberField
                label="Crecimiento por periodo (%)"
                value={state.growth}
                onChange={(value) => setState((current) => ({ ...current, growth: value }))}
              />
              <NumberField
                label="Tasa de descuento (%)"
                value={state.discountRate}
                onChange={(value) => setState((current) => ({ ...current, discountRate: value }))}
              />
            </div>
          </FormPanel>

          <ResultPanel className="self-auto h-full" title="Resultado" items={summary} />
        </div>

        <div ref={formulasRef}>
          <StepsPanel steps={steps} formulas={formulas} />
        </div>

        <div ref={chartRef}>
          <CashflowDiagram flows={flows} />
        </div>

        <div ref={tableRef}>
          <Table headers={["Periodo", "Flujo", "Valor presente"]} rows={tableRows} />
        </div>
      </div>
    </ModuleShell>
  )
}
