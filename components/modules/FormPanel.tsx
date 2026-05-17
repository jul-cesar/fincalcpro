import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type FormPanelProps = {
  children: ReactNode
  className?: string
}

export function FormPanel({ children, className }: FormPanelProps) {
  return (
    <div
      className={cn(
        "grid self-start content-start gap-2 rounded-3xl border border-border/70 bg-card/90 p-3.5 text-card-foreground shadow-sm",
        className
      )}
    >
      {children}
    </div>
  )
}
