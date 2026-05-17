"use client"

import { History, LoaderCircle, LogIn, Save, X } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

type HistoryRecord<TInput extends Record<string, string>> = {
  id: string
  module: string
  exerciseType: string
  title: string
  input: TInput
  updatedAt: string
}

type ToastState = {
  message: string
  tone: "success" | "error" | "info"
}

type ExerciseHistoryControlsProps<TInput extends Record<string, string>> = {
  module: string
  exerciseType: string
  state: TInput
  onApplyInput: (input: TInput) => void
  buildTitle: (input: TInput) => string
  modalTitle: string
}

export function ExerciseHistoryControls<TInput extends Record<string, string>>({
  module,
  exerciseType,
  state,
  onApplyInput,
  buildTitle,
  modalTitle,
}: ExerciseHistoryControlsProps<TInput>) {
  const { data: session } = authClient.useSession()
  const [saving, setSaving] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyItems, setHistoryItems] = useState<HistoryRecord<TInput>[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  const isLoggedIn = Boolean(session?.user?.id)

  function showToast(message: string, tone: ToastState["tone"] = "info") {
    setToast({ message, tone })
    window.setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current))
    }, 2600)
  }

  async function handleSaveExercise() {
    if (!isLoggedIn) {
      showToast("Inicia sesion para guardar ejercicios.", "info")
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/exercise-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module,
          exerciseType,
          title: buildTitle(state),
          input: state,
        }),
      })

      if (response.status === 409) {
        showToast("Este ejercicio ya esta guardado.", "info")
        return
      }

      if (!response.ok) {
        throw new Error("Save failed")
      }

      showToast("Ejercicio guardado correctamente.", "success")
    } catch {
      showToast("No se pudo guardar el ejercicio.", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleOpenHistory() {
    if (!isLoggedIn) {
      await authClient.signIn.social({ provider: "google" })
      return
    }

    setIsHistoryOpen(true)
    setHistoryLoading(true)
    setLoadError(null)
    try {
      const response = await fetch(`/api/exercise-history?module=${module}`)
      const data = (await response.json()) as { records?: HistoryRecord<TInput>[] }
      if (!response.ok || !data.records) throw new Error("Load failed")
      setHistoryItems(data.records)
    } catch {
      setLoadError("No se pudo cargar el historial.")
    } finally {
      setHistoryLoading(false)
    }
  }

  function handleApply(record: HistoryRecord<TInput>) {
    onApplyInput(record.input)
    setIsHistoryOpen(false)
    showToast("Ejercicio cargado y recalculado.", "success")
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={handleOpenHistory}>
          <History className="size-4" /> Cargar ejercicio
        </Button>
        <Button type="button" size="sm" onClick={handleSaveExercise} disabled={saving}>
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar ejercicio
        </Button>
        {!isLoggedIn ? (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <LogIn className="size-3" /> Inicia sesion para guardar historial.
          </span>
        ) : null}
      </div>

      {isHistoryOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">{modalTitle}</h3>
                <p className="text-xs text-muted-foreground">Selecciona un ejercicio para cargar sus valores.</p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setIsHistoryOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            {historyLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" /> Cargando ejercicios...
              </div>
            ) : null}

            {!historyLoading && loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}

            {!historyLoading && !loadError && historyItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aun no tienes ejercicios guardados en este modulo.</p>
            ) : null}

            {!historyLoading && !loadError && historyItems.length > 0 ? (
              <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                {historyItems.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-left transition hover:bg-muted"
                    onClick={() => handleApply(record)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{record.title}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {record.exerciseType}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(record.updatedAt).toLocaleString("es-CO")}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed right-4 bottom-4 z-[60]">
          <div
            className={`rounded-2xl border px-4 py-2 text-sm shadow-lg ${
              toast.tone === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                : toast.tone === "error"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-sky-500/40 bg-sky-500/10 text-sky-700"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </>
  )
}
