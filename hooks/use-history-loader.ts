"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

type HistoryResponse<TInput extends Record<string, string>> = {
  record?: {
    id: string
    module: string
    input: TInput
  }
}

export function useHistoryLoader<TInput extends Record<string, string>>(
  moduleId: string,
  onApplyInput: (input: TInput) => void
) {
  const searchParams = useSearchParams()
  const historyId = searchParams.get("historyId")

  useEffect(() => {
    async function loadFromHistory() {
      if (!historyId) return

      try {
        const response = await fetch(`/api/exercise-history/${historyId}`)
        const data = (await response.json()) as HistoryResponse<TInput>
        if (!response.ok || !data.record) return
        if (data.record.module !== moduleId) return
        onApplyInput(data.record.input)
      } catch {
        // ignored on purpose
      }
    }

    loadFromHistory()
  }, [historyId, moduleId, onApplyInput])
}
