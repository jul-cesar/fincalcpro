"use client"

import { Download, LoaderCircle } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { exportModuleToExcel } from "@/lib/excel-export"

type ExportExcelButtonProps = {
  getPayload: () => {
    fileName: string
    sheetName: string
    moduleTitle: string
    generatedAt: string
    inputs: Array<{ label: string; value: string }>
    results: Array<{ label: string; value: string }>
    formulas: string[]
    table?: {
      title: string
      headers: string[]
      rows: Array<Array<string | number>>
    }
    imageElements?: HTMLElement[]
  }
}

export function ExportExcelButton({ getPayload }: ExportExcelButtonProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleExport() {
    setLoading(true)
    setMessage(null)
    try {
      await exportModuleToExcel(getPayload())
      setMessage("Excel exportado correctamente.")
    } catch {
      setMessage("No se pudo exportar el Excel.")
    } finally {
      setLoading(false)
      window.setTimeout(() => setMessage(null), 2200)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" size="sm" variant="secondary" onClick={handleExport} disabled={loading}>
        {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
        Exportar Excel
      </Button>
      {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
    </div>
  )
}
