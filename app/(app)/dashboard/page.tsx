import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const metrics = [
  {
    label: "Modulos activos",
    value: "8",
    text: "Calculo, chat, evaluacion, tablas y visualizacion financiera.",
  },
  {
    label: "Motor",
    value: "IA + Decimal",
    text: "Agente conversacional y formulas auditables con precision decimal.",
  },
  {
    label: "Escenarios guardados",
    value: "0",
    text: "Datos persistentes en este navegador.",
  },
]

export default function DashboardPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="space-y-2">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {metric.text}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tablero del prototipo</CardTitle>
          <CardDescription>
            FinCalcPro se esta migrando a Next.js con shadcn/ui, charts y backend integrado.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            Asistente IA para interpretar enunciados.
          </div>
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            Interes simple y compuesto con pasos.
          </div>
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            Conversion equivalente de tasas.
          </div>
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
            Anualidades, amortizacion y VPN/TIR.
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
