"use client"

type TextareaFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
  helper?: string
}

export function TextareaField({ label, value, onChange, rows = 3, helper }: TextareaFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm text-muted-foreground">
      <span className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
        {label}
      </span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-2xl border border-border/70 bg-background/90 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
      />
      {helper ? <span className="text-xs text-muted-foreground">{helper}</span> : null}
    </label>
  )
}
