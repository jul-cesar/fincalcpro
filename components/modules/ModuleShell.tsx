import type { ReactNode } from "react"

type ModuleShellProps = {
  title?: string
  description?: string
  children: ReactNode
}

export function ModuleShell({ title, description, children }: ModuleShellProps) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 rounded-3xl border border-border/60 bg-gradient-to-br from-slate-900/5 via-transparent to-emerald-500/5 px-6 py-5">
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}
