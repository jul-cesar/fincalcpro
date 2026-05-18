"use client"

import { useMemo, useRef, useState } from "react"

import { ExportExcelButton } from "@/components/modules/ExportExcelButton"
import { ExerciseHistoryControls } from "@/components/modules/ExerciseHistoryControls"
import { FormPanel } from "@/components/modules/FormPanel"
import { ModuleShell } from "@/components/modules/ModuleShell"
import { NumberField } from "@/components/modules/NumberField"
import { ResultPanel } from "@/components/modules/ResultPanel"
import { SelectField } from "@/components/modules/SelectField"
import { SimpleBarChart } from "@/components/modules/SimpleBarChart"
import { StepsPanel } from "@/components/modules/StepsPanel"
import { Table } from "@/components/modules/Table"
import { amortization } from "@/lib/finance"
import { formatCurrency, formatNumber } from "@/lib/format"
import { useHistoryLoader } from "@/hooks/use-history-loader"

type FormState = {
  method: string
  loan: string
  rate: string
  periods: string
}

const methodOptions = [
  { label: "Frances - cuota fija", value: "french" },
  { label: "Aleman - abono fijo", value: "german" },
  { label: "Americano - intereses periodicos", value: "american" },
]

export default function AmortizationPage() {
  const formulasRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<FormState>({
    method: "french",
    loan: "12000000",
    rate: "1.8",
    periods: "12",
  })
  useHistoryLoader("amortization", setState)

  const loan = Number(state.loan || 0)
  const rate = Number(state.rate || 0)
  const periods = Number(state.periods || 0)
  const method = state.method === "german" || state.method === "american" ? state.method : "french"

  const result = useMemo(() => amortization(method, loan, rate, periods), [method, loan, rate, periods])

  const summary = [
    {
      label: "Primera cuota",
      value: formatCurrency.format(result.rows[0]?.payment ?? 0),
    },
    {
      label: "Ultima cuota",
      value: formatCurrency.format(result.rows.at(-1)?.payment ?? 0),
    },
    {
      label: "Total intereses",
      value: formatCurrency.format(result.totalInterest),
      tone: "negative" as const,
    },
    {
      label: "Total pagado",
      value: formatCurrency.format(result.totalPaid),
    },
  ]

  const steps = [
    "Selecciona el sistema de amortizacion y define prestamo, tasa y cuotas.",
    "Calcula interes por saldo y determina la cuota segun el metodo.",
    "Actualiza el saldo periodo a periodo hasta llegar a cero.",
  ]

  const formulas =
    method === "french"
      ? [
          String.raw`C = P \cdot \frac{i}{1 - (1+i)^{-n}}`,
          String.raw`P = ${formatNumber.format(loan)},\ i = ${formatNumber.format(rate / 100)},\ n = ${periods}`,
        ]
      : method === "german"
      ? [
          String.raw`Abono\ fijo = \frac{P}{n}`,
          String.raw`Cuota_t = Abono\ fijo + Interes_t`,
        ]
      : [
          String.raw`Cuota_t = Interes_t \quad (t < n)`,
          String.raw`Cuota_n = Interes_n + P`,
        ]

  const tableRows = result.rows.map((row) => [
    row.period,
    formatCurrency.format(row.payment),
    formatCurrency.format(row.interest),
    formatCurrency.format(row.capital),
    formatCurrency.format(row.balance),
  ])

  return (
    <ModuleShell
      title="Amortizacion"
      description="Compara amortizacion francesa, alemana y americana con detalle por periodo."
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
              module="amortization"
              exerciseType={`method_${method}`}
              state={state}
              onApplyInput={setState}
              buildTitle={(values) => `Amortizacion ${values.method} - ${formatCurrency.format(Number(values.loan || 0))}`}
              modalTitle="Historial de amortizacion"
            />
            <ExportExcelButton
              getPayload={() => ({
                fileName: `amortizacion-${Date.now()}`,
                sheetName: "Amortizacion",
                moduleTitle: "Amortizacion",
                generatedAt: new Date().toLocaleString("es-CO"),
                inputs: [
                  { label: "Sistema", value: state.method },
                  { label: "Monto del prestamo", value: state.loan },
                  { label: "Tasa por periodo (%)", value: state.rate },
                  { label: "Numero de cuotas", value: state.periods },
                ],
                results: summary.map((item) => ({ label: item.label, value: item.value })),
                formulas,
                table: {
                  title: "Tabla de amortizacion",
                  headers: ["Periodo", "Cuota", "Interes", "Abono", "Saldo"],
                  rows: tableRows,
                },
                imageElements: [formulasRef.current, chartRef.current, tableRef.current].filter(Boolean) as HTMLElement[],
              })}
            />
            <div className="grid gap-2 md:grid-cols-2">
              <SelectField
                label="Sistema"
                value={state.method}
                options={methodOptions}
                onChange={(value) => setState((current) => ({ ...current, method: value }))}
              />
              <NumberField
                label="Monto del prestamo"
                value={state.loan}
                onChange={(value) => setState((current) => ({ ...current, loan: value }))}
              />
              <NumberField
                label="Tasa por periodo (%)"
                value={state.rate}
                onChange={(value) => setState((current) => ({ ...current, rate: value }))}
              />
              <NumberField
                label="Numero de cuotas"
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
          <SimpleBarChart
            title="Interes por periodo"
            labels={result.rows.map((row) => String(row.period))}
            values={result.rows.map((row) => row.interest)}
          />
        </div>

        <div ref={tableRef}>
          <Table
            headers={["Periodo", "Cuota", "Interes", "Abono", "Saldo"]}
            rows={tableRows}
          />
        </div>
      </div>
    </ModuleShell>
  )
}
