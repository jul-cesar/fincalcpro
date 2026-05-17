"use client"

import { Input } from "@/components/ui/input"

type NumberFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  helper?: string
}

export function NumberField({ label, value, onChange, helper }: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm text-muted-foreground">
      <span className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
        {label}
      </span>
      <Input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-background/90 border-border/70 shadow-sm h-8"
      />
      {helper ? <span className="text-xs text-muted-foreground">{helper}</span> : null}
    </label>
  )
}
