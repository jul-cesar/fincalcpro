"use client"

import type { Dispatch, SetStateAction } from "react"
import { useEffect } from "react"

const AUTOFILL_STORAGE_KEY = "fincalcpro.autofill"

type AutofillPayload<TInput extends Record<string, string>> = {
  module: string
  fields: Partial<TInput>
}

export function useAutofillLoader<TInput extends Record<string, string>>(
  moduleId: string,
  onApplyInput: Dispatch<SetStateAction<TInput>>
) {
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get("autofill") !== "1") return

    const rawPayload = window.sessionStorage.getItem(AUTOFILL_STORAGE_KEY)
    if (!rawPayload) return

    try {
      const payload = JSON.parse(rawPayload) as AutofillPayload<TInput>
      if (payload.module !== moduleId || !payload.fields) return

      onApplyInput((current) => ({
        ...current,
        ...payload.fields,
      }))

      window.sessionStorage.removeItem(AUTOFILL_STORAGE_KEY)
      searchParams.delete("autofill")
      const nextSearch = searchParams.toString()
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`
      window.history.replaceState(null, "", nextUrl)
    } catch {
      window.sessionStorage.removeItem(AUTOFILL_STORAGE_KEY)
    }
  }, [moduleId, onApplyInput])
}

export { AUTOFILL_STORAGE_KEY }
