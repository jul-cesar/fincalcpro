"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { appModules } from "@/components/layout/modules"
import { SidebarFooterActions } from "@/components/layout/SidebarFooterActions"

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="group-data-[collapsible=icon]:justify-center">
              <Link href="/dashboard">
                <div className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
                  <Image
                    src="/fincalcpro-logo.svg"
                    alt="economath"
                    width={20}
                    height={20}
                    priority
                  />
                </div>
                <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-semibold">economath</span>
                  <span className="text-xs text-sidebar-foreground/70">Simulador financiero</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Modulos</SidebarGroupLabel>
          <SidebarMenu>
            {appModules.map((module, index) => (
              <SidebarMenuItem key={module.id}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === module.href}
                  tooltip={`${String(index + 1).padStart(2, "0")} · ${module.label}`}
                >
                  <Link href={module.href}>
                    <module.icon />
                    <span>{module.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarFooterActions />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
