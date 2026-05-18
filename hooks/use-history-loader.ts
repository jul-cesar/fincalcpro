"use client"

import type { Dispatch, SetStateAction } from "react"
import { useEffect } from "react"

type HistoryResponse<TInput extends Record<string, string>> = {
  record?: {
    id: string
    module: string
    input: TInput
  }
}

export function useHistoryLoader<TInput extends Record<string, string>>(
  moduleId: string,
  onApplyInput: Dispatch<SetStateAction<TInput>>
) {
  useEffect(() => {
    async function loadFromHistory() {
      const searchParams = new URLSearchParams(window.location.search)
      const historyId = searchParams.get("historyId")
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
  }, [moduleId, onApplyInput])
}
