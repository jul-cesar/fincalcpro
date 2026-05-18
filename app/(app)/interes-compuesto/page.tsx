"use client"

import { useMemo, useRef, useState } from "react"

import { ExportExcelButton } from "@/components/modules/ExportExcelButton"
import { ExerciseHistoryControls } from "@/components/modules/ExerciseHistoryControls"
import { FormPanel } from "@/components/modules/FormPanel"
import { ModuleShell } from "@/components/modules/ModuleShell"
import { NumberField } from "@/components/modules/NumberField"
import { ResultPanel } from "@/components/modules/ResultPanel"
import { SimpleLineChart } from "@/components/modules/SimpleLineChart"
import { StepsPanel } from "@/components/modules/StepsPanel"
import { compoundInterest } from "@/lib/finance"
import { formatCurrency, formatNumber } from "@/lib/format"
import { useHistoryLoader } from "@/hooks/use-history-loader"

type FormState = {
  principal: string
  rate: string
  periods: string
}

export default function CompoundInterestPage() {
  const chartRef = useRef<HTMLDivElement>(null)
  const formulasRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<FormState>({
    principal: "5000000",
    rate: "2.5",
    periods: "12",
  })
  useHistoryLoader("compound", setState)

  const principal = Number(state.principal || 0)
  const rate = Number(state.rate || 0)
  const periods = Number(state.periods || 0)

  const result = useMemo(
    () => compoundInterest(principal, rate, periods),
    [principal, rate, periods]
  )

  const summary = [
    {
      label: "Interes compuesto",
      value: formatCurrency.format(result.interest),
      tone: result.interest >= 0 ? "positive" : "negative",
    },
    {
      label: "Monto final",
      value: formatCurrency.format(result.amount),
    },
    {
      label: "Factor financiero",
      value: formatNumber.format(result.factor),
    },
  ]

  const steps = [
    "Identifica capital, tasa y numero de periodos.",
    "Calcula el factor financiero (1 + i)^n.",
    "Multiplica el capital por el factor para obtener el monto final.",
  ]

  const formulas = [
    String.raw`F = P \cdot (1 + i)^n`,
    String.raw`F = ${formatNumber.format(principal)} \cdot (1 + ${formatNumber.format(
      rate / 100
    )})^{${periods}}`,
    String.raw`I = F - P = ${formatNumber.format(result.amount)} - ${formatNumber.format(
      principal
    )}`,
  ]

  return (
    <ModuleShell
      title="Interes compuesto"
      description="Calcula el crecimiento del capital con capitalizacion por periodo."
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
              module="compound"
              exerciseType="final_amount"
              state={state}
              onApplyInput={setState}
              buildTitle={(values) => `Interes compuesto - ${formatCurrency.format(Number(values.principal || 0))} a ${Number(values.periods || 0)} periodos`}
              modalTitle="Historial de interes compuesto"
            />
            <ExportExcelButton
              getPayload={() => ({
                fileName: `interes-compuesto-${Date.now()}`,
                sheetName: "InteresCompuesto",
                moduleTitle: "Interes compuesto",
                generatedAt: new Date().toLocaleString("es-CO"),
                inputs: [
                  { label: "Capital inicial", value: state.principal },
                  { label: "Tasa por periodo (%)", value: state.rate },
                  { label: "Numero de periodos", value: state.periods },
                ],
                results: summary.map((item) => ({ label: item.label, value: item.value })),
                formulas,
                imageElements: [formulasRef.current, chartRef.current].filter(Boolean) as HTMLElement[],
              })}
            />
            <div className="grid gap-2 md:grid-cols-3">
              <NumberField
                label="Capital inicial"
                value={state.principal}
                onChange={(value) => setState((current) => ({ ...current, principal: value }))}
              />
              <NumberField
                label="Tasa por periodo (%)"
                value={state.rate}
                onChange={(value) => setState((current) => ({ ...current, rate: value }))}
              />
              <NumberField
                label="Numero de periodos"
                value={state.periods}
                onChange={(value) => setState((current) => ({ ...current, periods: value }))}
              />
            </div>
          </FormPanel>
          <ResultPanel className="self-auto h-full" title="Resultado" items={summary} />
        </div>

        <div ref={formulasRef}>
          <StepsPanel steps={steps} formulas={formulas} />
        </div>

        <div ref={chartRef}>
          <SimpleLineChart title="Crecimiento compuesto" values={result.series} />
        </div>
      </div>
    </ModuleShell>
  )
}
