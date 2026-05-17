"use client"

import { usePathname } from "next/navigation"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { getModuleByPath } from "@/components/layout/modules"

export function AppTopbar() {
  const pathname = usePathname()
  const active = getModuleByPath(pathname)

  return (
    <header className="flex flex-col gap-4 border-b border-border bg-background/95 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Simulador financiero web
          </p>
          <h1 className="text-2xl font-semibold text-foreground">{active.label}</h1>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2" />
    </header>
  )
}
