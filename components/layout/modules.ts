import {
  ArrowDownToLine,
  BookOpenCheck,
  Bot,
  ChartNoAxesCombined,
  Landmark,
  RotateCcw,
  Sparkles,
  WalletCards,
} from "lucide-react"

export type AppModule = {
  id: string
  label: string
  href: string
  icon: typeof Sparkles
}

export const appModules: AppModule[] = [
  { id: "dashboard", label: "Panel", href: "/dashboard", icon: Sparkles },
  { id: "assistant", label: "Asistente IA", href: "/asistente", icon: Bot },
  { id: "simple", label: "Interes simple", href: "/interes-simple", icon: ChartNoAxesCombined },
  { id: "compound", label: "Interes compuesto", href: "/interes-compuesto", icon: ChartNoAxesCombined },
  { id: "rates", label: "Conversion de tasas", href: "/conversion-tasas", icon: RotateCcw },
  { id: "annuity", label: "Anualidades", href: "/anualidades", icon: WalletCards },
  { id: "amortization", label: "Amortizacion", href: "/amortizacion", icon: Landmark },
  { id: "project", label: "VPN y TIR", href: "/vpn-tir", icon: BookOpenCheck },
  { id: "cashflow", label: "Flujo de caja", href: "/flujo-caja", icon: ArrowDownToLine },
]

export function getModuleByPath(pathname: string) {
  const match = appModules.find((module) => pathname === module.href)
  return match ?? appModules[0]
}
