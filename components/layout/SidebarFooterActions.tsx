"use client"

import { LogOut, MonitorCog } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"
import { ModeToggle } from "../toggle-mode"

export function SidebarFooterActions() {
  const { data: session } = authClient.useSession()

  async function handleLogin() {
    await authClient.signIn.social({ provider: "google" })
  }

  async function handleLogout() {
    await authClient.signOut()
  }

  const user = session?.user
  const fallback = user?.name?.slice(0, 2)?.toUpperCase() || "FP"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {!user ? (
          <SidebarMenuButton tooltip="Iniciar sesion" onClick={handleLogin}>
            <span className="flex size-4 items-center justify-center">
              <svg aria-hidden="true" viewBox="0 0 48 48" className="size-4">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.21 1.54 7.63 2.83l5.2-5.2C33.7 4.4 29.3 2.5 24 2.5 14.9 2.5 7.1 7.7 3.5 15.3l6.2 4.8C11.6 13.2 17.3 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.5 24.5c0-1.5-.14-2.95-.41-4.35H24v8.23h12.63c-.54 2.93-2.2 5.4-4.67 7.05l7.1 5.52c4.15-3.83 6.44-9.45 6.44-16.45z"
                />
                <path
                  fill="#FBBC05"
                  d="M9.7 28.4a14.5 14.5 0 0 1 0-8.8l-6.2-4.8a23.9 23.9 0 0 0 0 18.4l6.2-4.8z"
                />
                <path
                  fill="#34A853"
                  d="M24 46.5c5.3 0 9.76-1.75 13-4.75l-7.1-5.52c-1.97 1.32-4.5 2.1-5.9 2.1-6.7 0-12.4-3.7-14.3-10.1l-6.2 4.8C7.1 40.3 14.9 46.5 24 46.5z"
                />
              </svg>
            </span>
            <span>Iniciar sesion</span>
          </SidebarMenuButton>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <SidebarMenuButton tooltip={user.name ?? "Cuenta"}>
                <Avatar className="size-5">
                  <AvatarImage src={user.image ?? undefined} alt={user.name ?? "Usuario"} />
                  <AvatarFallback>{fallback}</AvatarFallback>
                </Avatar>
                <span>{user.name ?? "Cuenta"}</span>
              </SidebarMenuButton>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72">
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarImage src={user.image ?? undefined} alt={user.name ?? "Usuario"} />
                  <AvatarFallback>{fallback}</AvatarFallback>
                </Avatar>
                <div className="grid">
                  <span className="text-sm font-semibold text-foreground">{user.name ?? "Usuario"}</span>
                  <span className="text-xs text-muted-foreground">{user.email ?? ""}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Sesión activa</span>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-1 text-xs font-medium text-foreground transition hover:bg-muted"
                  onClick={handleLogout}
                >
                  <LogOut className="size-3" />
                  Cerrar sesión
                </button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </SidebarMenuItem>
      <SidebarMenuItem>
        <div className="flex w-full items-center justify-between rounded-xl border border-sidebar-border/70 bg-sidebar-accent/30 px-2.5 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1.5">
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/80 group-data-[collapsible=icon]:hidden">
            <MonitorCog className="size-3.5" />
            <span className="font-medium">Tema</span>
          </div>
          <ModeToggle />
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
