"use client"

import { useMemo, useRef, useState } from "react"

import { ExportExcelButton } from "@/components/modules/ExportExcelButton"
import { ExerciseHistoryControls } from "@/components/modules/ExerciseHistoryControls"
import { FormPanel } from "@/components/modules/FormPanel"
import { ModuleShell } from "@/components/modules/ModuleShell"
import { NumberField } from "@/components/modules/NumberField"
import { ResultPanel } from "@/components/modules/ResultPanel"
import { StepsPanel } from "@/components/modules/StepsPanel"
import { SimpleLineChart } from "@/components/modules/SimpleLineChart"
import { simpleInterest } from "@/lib/finance"
import { formatCurrency, formatNumber } from "@/lib/format"
import { useAutofillLoader } from "@/hooks/use-autofill-loader"
import { useHistoryLoader } from "@/hooks/use-history-loader"

type FormState = {
  principal: string
  rate: string
  periods: string
}

export default function SimpleInterestPage() {
  const chartRef = useRef<HTMLDivElement>(null)
  const formulasRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<FormState>({
    principal: "5000000",
    rate: "2.5",
    periods: "12",
  })
  useHistoryLoader("simple", setState)
  useAutofillLoader("simple", setState)

  const principal = Number(state.principal || 0)
  const rate = Number(state.rate || 0)
  const periods = Number(state.periods || 0)

  const result = useMemo(
    () => simpleInterest(principal, rate, periods),
    [principal, rate, periods]
  )

  const summary = [
    {
      label: "Interes generado",
      value: formatCurrency.format(result.interest),
      tone: result.interest >= 0 ? "positive" : "negative",
    },
    {
      label: "Monto final",
      value: formatCurrency.format(result.amount),
    },
    {
      label: "Tasa decimal",
      value: formatNumber.format(result.decimalRate),
    },
  ]

  const steps = [
    "Identifica capital, tasa y numero de periodos.",
    "Calcula el interes total y suma al capital inicial.",
    "Presenta el monto final con formato monetario.",
  ]

  const formulas = [
    String.raw`I = P \cdot i \cdot n`,
    String.raw`I = ${formatNumber.format(principal)} \cdot ${formatNumber.format(
      rate / 100
    )} \cdot ${periods}`,
    String.raw`F = P + I = ${formatNumber.format(principal)} + ${formatNumber.format(
      result.interest
    )}`,
  ]

  function buildTitleFromState(values: FormState) {
    const amount = Number(values.principal || 0)
    const periodsValue = Number(values.periods || 0)
    return `Interes simple - ${formatCurrency.format(amount)} a ${periodsValue} periodos`
  }

  return (
    <ModuleShell
      title="Interes simple"
      description="Calcula el interes generado con capital, tasa y periodos definidos."
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
              module="simple"
              exerciseType="final_amount"
              state={state}
              onApplyInput={setState}
              buildTitle={buildTitleFromState}
              modalTitle="Historial de interes simple"
            />
            <ExportExcelButton
              getPayload={() => ({
                fileName: `interes-simple-${Date.now()}`,
                sheetName: "InteresSimple",
                moduleTitle: "Interes simple",
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
          <SimpleLineChart title="Evolucion del monto simple" values={result.series} />
        </div>
      </div>

    </ModuleShell>
  )
}
