"use client"

import { useMemo, useRef, useState } from "react"

import { ExportExcelButton } from "@/components/modules/ExportExcelButton"
import { ExerciseHistoryControls } from "@/components/modules/ExerciseHistoryControls"
import { FormPanel } from "@/components/modules/FormPanel"
import { ModuleShell } from "@/components/modules/ModuleShell"
import { AnnuityDiagram } from "@/components/modules/AnnuityDiagram"
import { NumberField } from "@/components/modules/NumberField"
import { ResultPanel } from "@/components/modules/ResultPanel"
import { SelectField } from "@/components/modules/SelectField"
import { StepsPanel } from "@/components/modules/StepsPanel"
import { Table } from "@/components/modules/Table"
import { annuityPayment } from "@/lib/finance"
import { formatCurrency, formatNumber } from "@/lib/format"

type FormState = {
  futureValue: string
  rate: string
  periods: string
  timing: string
}

const timingOptions = [
  { label: "Final de cada periodo", value: "end" },
  { label: "Inicio de cada periodo", value: "beginning" },
]

export default function AnnuitiesPage() {
  const formulasRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<FormState>({
    futureValue: "8500000",
    rate: "2.5",
    periods: "24",
    timing: "end",
  })

  const futureValue = Number(state.futureValue || 0)
  const rate = Number(state.rate || 0)
  const periods = Number(state.periods || 0)
  const timing = state.timing === "beginning" ? "beginning" : "end"

  const result = useMemo(
    () => annuityPayment(futureValue, rate, periods, timing),
    [futureValue, rate, periods, timing]
  )

  const summary = [
    {
      label: "Deposito periodico",
      value: formatCurrency.format(result.payment),
      tone: "positive",
    },
    {
      label: "Total depositado",
      value: formatCurrency.format(result.totalDeposits),
    },
    {
      label: "Intereses ganados",
      value: formatCurrency.format(result.totalInterest),
      tone: "positive",
    },
    {
      label: "Saldo final",
      value: formatCurrency.format(result.rows.at(-1)?.balance ?? 0),
    },
  ]

  const steps = [
    timing === "end"
      ? "Se usa anualidad vencida (depositos al final de cada periodo)."
      : "Se usa anualidad anticipada (depositos al inicio de cada periodo).",
    "Calcula el deposito periodico con la tasa y periodos definidos.",
    "Acumula el saldo con intereses en cada periodo.",
  ]

  const formulas = [
    timing === "end"
      ? String.raw`A = \frac{VF \cdot i}{(1 + i)^n - 1}`
      : String.raw`A = \frac{VF \cdot i}{((1 + i)^n - 1)(1 + i)}`,
    String.raw`VF = ${formatNumber.format(futureValue)},\ i = ${formatNumber.format(
      rate / 100
    )},\ n = ${periods}`,
    String.raw`A = ${formatNumber.format(result.payment)}`,
  ]

  const tableRows = result.rows.map((row) => [
    row.period,
    formatCurrency.format(row.payment),
    formatCurrency.format(row.interest),
    formatCurrency.format(row.balance),
  ])

  return (
    <ModuleShell
      title="Anualidades"
      description="Calcula el deposito periodico necesario para alcanzar un valor futuro."
    >
      <div className="grid gap-5">
        <FormPanel className="gap-2.5">
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
            module="annuity"
            exerciseType={timing === "beginning" ? "payment_beginning" : "payment_end"}
            state={state}
            onApplyInput={setState}
            buildTitle={(values) => `Anualidad - VF ${formatCurrency.format(Number(values.futureValue || 0))} en ${Number(values.periods || 0)} periodos`}
            modalTitle="Historial de anualidades"
          />
          <ExportExcelButton
            getPayload={() => ({
              fileName: `anualidades-${Date.now()}`,
              sheetName: "Anualidades",
              moduleTitle: "Anualidades",
              generatedAt: new Date().toLocaleString("es-CO"),
              inputs: [
                { label: "Valor futuro objetivo", value: state.futureValue },
                { label: "Tasa por periodo (%)", value: state.rate },
                { label: "Numero de periodos", value: state.periods },
                { label: "Momento del deposito", value: state.timing },
              ],
              results: summary.map((item) => ({ label: item.label, value: item.value })),
              formulas,
              table: {
                title: "Tabla de anualidad",
                headers: ["Periodo", "Deposito", "Interes", "Saldo"],
                rows: tableRows,
              },
              imageElements: [formulasRef.current, chartRef.current, tableRef.current].filter(Boolean) as HTMLElement[],
            })}
          />
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <NumberField
              label="Valor futuro objetivo"
              value={state.futureValue}
              onChange={(value) => setState((current) => ({ ...current, futureValue: value }))}
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
            <SelectField
              label="Momento del deposito"
              value={state.timing}
              options={timingOptions}
              onChange={(value) => setState((current) => ({ ...current, timing: value }))}
            />
          </div>
        </FormPanel>

        <div ref={formulasRef}>
          <StepsPanel steps={steps} formulas={formulas} />
        </div>

        <ResultPanel title="Resultado" items={summary} />

        <div ref={chartRef}>
          <AnnuityDiagram
            payment={result.payment}
            futureValue={futureValue}
            periods={periods}
            timing={timing}
          />
        </div>

        <div ref={tableRef}>
          <Table
            headers={["Periodo", "Deposito", "Interes", "Saldo"]}
            rows={tableRows}
          />
        </div>
      </div>
    </ModuleShell>
  )
}
