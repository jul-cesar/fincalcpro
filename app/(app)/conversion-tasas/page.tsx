"use client"

import { useMemo, useRef, useState } from "react"

import { ExportExcelButton } from "@/components/modules/ExportExcelButton"
import { ExerciseHistoryControls } from "@/components/modules/ExerciseHistoryControls"
import { FormPanel } from "@/components/modules/FormPanel"
import { ModuleShell } from "@/components/modules/ModuleShell"
import { NumberField } from "@/components/modules/NumberField"
import { ResultPanel } from "@/components/modules/ResultPanel"
import { SelectField } from "@/components/modules/SelectField"
import { StepsPanel } from "@/components/modules/StepsPanel"
import { convertEffectiveRate } from "@/lib/finance"
import { asPercent, formatNumber } from "@/lib/format"
import { useHistoryLoader } from "@/hooks/use-history-loader"

type FormState = {
  rate: string
  sourceFrequency: string
  targetFrequency: string
}

const frequencyOptions = [
  { label: "Anual", value: "1" },
  { label: "Semestral", value: "2" },
  { label: "Trimestral", value: "4" },
  { label: "Mensual", value: "12" },
  { label: "Diaria", value: "360" },
]

export default function RateConversionPage() {
  const formulasRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<FormState>({
    rate: "3",
    sourceFrequency: "12",
    targetFrequency: "1",
  })
  useHistoryLoader("rates", setState)

  const rate = Number(state.rate || 0)
  const sourceFrequency = Number(state.sourceFrequency || 1)
  const targetFrequency = Number(state.targetFrequency || 1)

  const result = useMemo(
    () => convertEffectiveRate(rate, sourceFrequency, targetFrequency),
    [rate, sourceFrequency, targetFrequency]
  )

  const summary = [
    {
      label: "Tasa efectiva anual",
      value: asPercent(result.annualEffective),
    },
    {
      label: "Tasa equivalente destino",
      value: asPercent(result.targetRate),
    },
    {
      label: "Periodos destino por ano",
      value: String(targetFrequency),
    },
  ]

  const steps = [
    "Anualiza la tasa efectiva de origen.",
    "Convierte la tasa anual a la frecuencia destino.",
  ]

  const formulas = [
    String.raw`EA = (1 + i_{origen})^{m} - 1`,
    String.raw`EA = (1 + ${formatNumber.format(result.sourceRate)})^{${sourceFrequency}} - 1`,
    String.raw`i_{destino} = (1 + EA)^{1/${targetFrequency}} - 1`,
  ]

  return (
    <ModuleShell
      title="Conversion de tasas"
      description="Convierte tasas efectivas entre diferentes frecuencias de capitalizacion."
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
              module="rates"
              exerciseType="effective_conversion"
              state={state}
              onApplyInput={setState}
              buildTitle={(values) => `Conversion tasas - ${values.rate}% de ${values.sourceFrequency} a ${values.targetFrequency}`}
              modalTitle="Historial de conversion de tasas"
            />
            <ExportExcelButton
              getPayload={() => ({
                fileName: `conversion-tasas-${Date.now()}`,
                sheetName: "ConversionTasas",
                moduleTitle: "Conversion de tasas",
                generatedAt: new Date().toLocaleString("es-CO"),
                inputs: [
                  { label: "Tasa efectiva origen (%)", value: state.rate },
                  { label: "Periodos origen", value: state.sourceFrequency },
                  { label: "Periodos destino", value: state.targetFrequency },
                ],
                results: summary.map((item) => ({ label: item.label, value: item.value })),
                formulas,
                imageElements: [formulasRef.current].filter(Boolean) as HTMLElement[],
              })}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <NumberField
                label="Tasa efectiva origen (%)"
                value={state.rate}
                onChange={(value) => setState((current) => ({ ...current, rate: value }))}
              />
              <SelectField
                label="Periodos origen por ano"
                value={state.sourceFrequency}
                options={frequencyOptions}
                onChange={(value) => setState((current) => ({ ...current, sourceFrequency: value }))}
              />
              <SelectField
                label="Periodos destino por ano"
                value={state.targetFrequency}
                options={frequencyOptions}
                onChange={(value) => setState((current) => ({ ...current, targetFrequency: value }))}
              />
            </div>
          </FormPanel>
          <ResultPanel className="self-auto h-full" title="Resultado" items={summary} />
        </div>

        <div ref={formulasRef}>
          <StepsPanel steps={steps} formulas={formulas} />
        </div>
      </div>
    </ModuleShell>
  )
}
