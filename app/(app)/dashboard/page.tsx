"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { appModules } from "@/components/layout/modules"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authClient } from "@/lib/auth-client"

type HistoryRecord = {
  id: string
  module: string
  exerciseType: string
  title: string
  updatedAt: string
}

const moduleDescriptions: Record<string, string> = {
  assistant: "Resuelve enunciados financieros con asistencia inteligente.",
  simple: "Interes simple con pasos y evolucion del monto.",
  compound: "Interes compuesto, factor financiero y crecimiento.",
  rates: "Conversion de tasas efectivas entre frecuencias.",
  annuity: "Depositos periodicos para alcanzar valor futuro.",
  amortization: "Tabla de amortizacion por sistema frances, aleman o americano.",
  project: "Compara alternativas con VPN y TIR.",
  cashflow: "Proyeccion de flujo con VPN y TIR.",
}

const moduleRouteById: Record<string, string> = {
  simple: "/interes-simple",
  compound: "/interes-compuesto",
  rates: "/conversion-tasas",
  annuity: "/anualidades",
  amortization: "/amortizacion",
  project: "/vpn-tir",
  cashflow: "/flujo-caja",
}

export default function DashboardPage() {
  const { data: session } = authClient.useSession()
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(false)

  const exerciseModules = useMemo(
    () => appModules.filter((item) => item.id !== "dashboard"),
    []
  )

  useEffect(() => {
    async function loadHistory() {
      if (!session?.user?.id) {
        setHistory([])
        return
      }

      setLoading(true)
      try {
        const response = await fetch("/api/exercise-history?limit=20")
        const data = (await response.json()) as { records?: HistoryRecord[] }
        if (!response.ok || !data.records) {
          setHistory([])
          return
        }
        setHistory(data.records)
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [session?.user?.id])

  return (
    <section className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tipos de ejercicios que puedes resolver</CardTitle>
          <CardDescription>
            Accede rapido a cada modulo y continua tus practicas.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {exerciseModules.map((module) => (
            <article key={module.id} className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2">
                <module.icon className="size-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{module.label}</h3>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                {moduleDescriptions[module.id] ?? "Modulo de ejercicios financieros."}
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href={module.href}>Abrir modulo</Link>
              </Button>
            </article>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tu historial</CardTitle>
          <CardDescription>
            Reabre ejercicios guardados y continua donde quedaste.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {!session?.user?.id ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">
                Inicia sesion para guardar ejercicios y ver tu historial completo.
              </p>
              <Button className="mt-3" size="sm" onClick={() => authClient.signIn.social({ provider: "google" })}>
                Iniciar sesion
              </Button>
            </div>
          ) : loading ? (
            <p className="text-sm text-muted-foreground">Cargando historial...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aun no tienes ejercicios guardados.</p>
          ) : (
            history.map((item) => {
              const href = moduleRouteById[item.module]
              if (!href) return null
              return (
                <Link
                  key={item.id}
                  href={`${href}?historyId=${item.id}`}
                  className="rounded-2xl border border-border bg-background px-4 py-3 transition hover:bg-muted"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {item.exerciseType}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.module} · {new Date(item.updatedAt).toLocaleString("es-CO")}
                  </p>
                </Link>
              )
            })
          )}
        </CardContent>
      </Card>
    </section>
  )
}
