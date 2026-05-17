"use client"

import { useMemo, useRef, useState } from "react"

import { ExportExcelButton } from "@/components/modules/ExportExcelButton"
import { ExerciseHistoryControls } from "@/components/modules/ExerciseHistoryControls"
import { FormPanel } from "@/components/modules/FormPanel"
import { ModuleShell } from "@/components/modules/ModuleShell"
import { NumberField } from "@/components/modules/NumberField"
import { ResultPanel } from "@/components/modules/ResultPanel"
import { SimpleBarChart } from "@/components/modules/SimpleBarChart"
import { StepsPanel } from "@/components/modules/StepsPanel"
import { Table } from "@/components/modules/Table"
import { TextareaField } from "@/components/modules/TextareaField"
import { internalRateOfReturn, netPresentValue, parseFlows } from "@/lib/finance"
import { asPercent, formatCurrency, formatNumber } from "@/lib/format"

type FormState = {
  discountRate: string
  flowA: string
  flowB: string
}

export default function NpvIrrPage() {
  const formulasRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<FormState>({
    discountRate: "12",
    flowA: "-10000000, 3200000, 3400000, 3600000, 4000000",
    flowB: "-8500000, 2500000, 3000000, 3200000, 3600000",
  })

  const discountRate = Number(state.discountRate || 0)

  const { flowA, flowB, npvA, npvB, irrA, irrB, winner } = useMemo(() => {
    const flowA = parseFlows(state.flowA)
    const flowB = parseFlows(state.flowB)
    const discount = discountRate / 100
    const npvA = netPresentValue(flowA, discount)
    const npvB = netPresentValue(flowB, discount)
    const irrA = internalRateOfReturn(flowA)
    const irrB = internalRateOfReturn(flowB)
    const winner = npvA >= npvB ? "Alternativa A" : "Alternativa B"
    return { flowA, flowB, npvA, npvB, irrA, irrB, winner }
  }, [state.flowA, state.flowB, discountRate])

  const summary = [
    {
      label: "VPN alternativa A",
      value: formatCurrency.format(npvA),
      tone: npvA >= 0 ? "positive" : "negative",
    },
    {
      label: "TIR alternativa A",
      value: Number.isFinite(irrA) ? asPercent(irrA) : "No converge",
    },
    {
      label: "VPN alternativa B",
      value: formatCurrency.format(npvB),
      tone: npvB >= 0 ? "positive" : "negative",
    },
    {
      label: "TIR alternativa B",
      value: Number.isFinite(irrB) ? asPercent(irrB) : "No converge",
    },
    {
      label: "Mejor opcion por VPN",
      value: winner,
      tone: "positive" as const,
    },
  ]

  const steps = [
    "Convierte la tasa de oportunidad a decimal y evalua cada flujo.",
    "Calcula el VPN descontando cada flujo en su periodo.",
    "Estima la TIR y compara alternativas por VPN.",
  ]

  const formulas = [
    String.raw`VPN = \sum_{t=0}^{n} \frac{F_t}{(1+i)^t}`,
    String.raw`i = ${formatNumber.format(discountRate / 100)}`,
    String.raw`Decision = ${winner === "Alternativa A" ? "A" : "B"}`,
  ]

  const tableRows = [
    ["A", formatCurrency.format(npvA), Number.isFinite(irrA) ? asPercent(irrA) : "No converge", flowA.length],
    ["B", formatCurrency.format(npvB), Number.isFinite(irrB) ? asPercent(irrB) : "No converge", flowB.length],
  ]

  return (
    <ModuleShell
      title="VPN y TIR"
      description="Evalua alternativas de inversion con valor presente neto y tasa interna de retorno."
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
              module="project"
              exerciseType="npv_irr_compare"
              state={state}
              onApplyInput={setState}
              buildTitle={(values) => `VPN/TIR - tasa ${values.discountRate}%`}
              modalTitle="Historial de VPN y TIR"
            />
            <ExportExcelButton
              getPayload={() => ({
                fileName: `vpn-tir-${Date.now()}`,
                sheetName: "VPN_TIR",
                moduleTitle: "VPN y TIR",
                generatedAt: new Date().toLocaleString("es-CO"),
                inputs: [
                  { label: "Tasa de oportunidad (%)", value: state.discountRate },
                  { label: "Flujos alternativa A", value: state.flowA },
                  { label: "Flujos alternativa B", value: state.flowB },
                ],
                results: summary.map((item) => ({ label: item.label, value: item.value })),
                formulas,
                table: {
                  title: "Comparativo",
                  headers: ["Alternativa", "VPN", "TIR", "Cantidad de flujos"],
                  rows: tableRows,
                },
                imageElements: [formulasRef.current, chartRef.current, tableRef.current].filter(Boolean) as HTMLElement[],
              })}
            />
            <div className="grid gap-2">
              <NumberField
                label="Tasa de oportunidad (%)"
                value={state.discountRate}
                onChange={(value) => setState((current) => ({ ...current, discountRate: value }))}
              />
              <TextareaField
                label="Flujos alternativa A"
                value={state.flowA}
                onChange={(value) => setState((current) => ({ ...current, flowA: value }))}
                helper="Separa con coma. Ejemplo: -1000, 500, 700"
              />
              <TextareaField
                label="Flujos alternativa B"
                value={state.flowB}
                onChange={(value) => setState((current) => ({ ...current, flowB: value }))}
                helper="Separa con coma. Ejemplo: -900, 400, 650"
              />
            </div>
          </FormPanel>

          <ResultPanel className="self-auto h-full" title="Resultado" items={summary} />
        </div>

        <div ref={formulasRef}>
          <StepsPanel steps={steps} formulas={formulas} />
        </div>

        <div ref={chartRef}>
          <SimpleBarChart title="Comparativo de VPN" labels={["A", "B"]} values={[npvA, npvB]} />
        </div>

        <div ref={tableRef}>
          <Table
            headers={["Alternativa", "VPN", "TIR", "Cantidad de flujos"]}
            rows={tableRows}
          />
        </div>
      </div>
    </ModuleShell>
  )
}
