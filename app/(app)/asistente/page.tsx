"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bot, ClipboardCheck, Loader2, MessageSquarePlus, Send, Sparkles, Trash2, UserRound } from "lucide-react"
import { BlockMath } from "react-katex"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ModuleShell } from "@/components/modules/ModuleShell"
import { AUTOFILL_STORAGE_KEY } from "@/hooks/use-autofill-loader"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  meta?: string
  sections?: AssistantSection[]
  suggestion?: AssistantSuggestion
  checks?: AssistantCheck[]
}

type AssistantSection = {
  title: string
  body: string
  formula?: string
}

type AssistantCheck = {
  type: "warning" | "info"
  message: string
}

type AssistantSuggestion = {
  module: ModuleId
  fields: Record<string, string>
  summary?: string
  mappings?: Array<{
    field: string
    label: string
    value: string
    reason: string
  }>
}

type ChatRecord = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

const initialMessages: ChatMessage[] = [
  {
    id: "welcome-v2",
    role: "assistant",
    content:
      "Hola, soy el asistente financiero de FinCalcPro. Escribe un enunciado y te digo que modulo usar, donde poner cada dato y como interpretar el resultado.",
    meta: "Listo para analizar ejercicios",
  },
]

const CHAT_STORAGE_KEY = "fincalcpro.assistant-chat.v1"

const quickPrompts = [
  "Cuanto debo depositar cada mes durante 24 meses al 2.5% mensual para reunir 8.500.000?",
  "Tengo dos alternativas de inversion y quiero calcular VPN y TIR.",
  "Necesito una tabla de amortizacion para un prestamo con tasa mensual.",
  "Inverti 5.000.000 al 2% mensual durante 12 meses con interes simple. Cual es el monto final?",
  "Si deposito 3.000.000 al 1.8% mensual durante 18 meses con interes compuesto, cuanto tendre al final?",
  "Convierte una tasa efectiva mensual del 2.5% a una tasa efectiva anual.",
  "Cuanto debo depositar al inicio de cada mes para reunir 12.000.000 en 18 meses al 1.7% mensual?",
  "Compara amortizacion francesa y alemana para un prestamo de 20.000.000 al 1.6% mensual en 24 cuotas.",
  "Evalua un proyecto con inversion inicial de 15.000.000 y flujos de 4.000.000, 5.000.000, 6.000.000 y 7.000.000 con tasa del 12%.",
  "Proyecta un flujo de caja con inversion inicial de 10.000.000, pagos de 3.000.000, crecimiento del 4% y tasa de descuento del 12%.",
]

const moduleLinks = [
  { label: "Anualidades", href: "/anualidades" },
  { label: "VPN y TIR", href: "/vpn-tir" },
  { label: "Amortizacion", href: "/amortizacion" },
  { label: "Conversion de tasas", href: "/conversion-tasas" },
]

const moduleRoutes = {
  simple: { label: "Interes simple", href: "/interes-simple" },
  compound: { label: "Interes compuesto", href: "/interes-compuesto" },
  rates: { label: "Conversion de tasas", href: "/conversion-tasas" },
  annuity: { label: "Anualidades", href: "/anualidades" },
  amortization: { label: "Amortizacion", href: "/amortizacion" },
  project: { label: "VPN y TIR", href: "/vpn-tir" },
  cashflow: { label: "Flujo de caja", href: "/flujo-caja" },
} as const

type ModuleId = keyof typeof moduleRoutes

export default function AssistantPage() {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [hasLoadedMessages, setHasLoadedMessages] = useState(false)
  const [activeChatId, setActiveChatId] = useState("")
  const [chatHistory, setChatHistory] = useState<ChatRecord[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    try {
      const rawMessages = window.sessionStorage.getItem(CHAT_STORAGE_KEY)
      if (!rawMessages) return
      const parsedMessages = JSON.parse(rawMessages)
      if (!Array.isArray(parsedMessages)) return
      const restoredMessages = parsedMessages.filter(isChatMessage)
      if (restoredMessages.length) setMessages(restoredMessages)
    } catch {
      window.sessionStorage.removeItem(CHAT_STORAGE_KEY)
    } finally {
      setHasLoadedMessages(true)
    }
  }, [])

  useEffect(() => {
    if (!hasLoadedMessages) return
    window.sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
  }, [hasLoadedMessages, messages])

  useEffect(() => {
    if (session?.user) {
      loadChatHistory()
    } else {
      setChatHistory([])
      setActiveChatId("")
    }
  }, [session?.user])

  const chatPayload = useMemo(
    () =>
      messages
        .filter((message) => message.id !== "welcome")
        .map((message) => ({
          role: message.role,
          content: [
            message.content,
            message.suggestion
              ? `Datos estructurados actuales: ${JSON.stringify({
                  module: message.suggestion.module,
                  fields: message.suggestion.fields,
                })}`
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
        })),
    [messages]
  )

  async function submitMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const content = input.trim()
    if (!content || isLoading) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    }

    setMessages((current) => [...current, userMessage])
    setInput("")
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatPayload, { role: "user", content }],
          chatId: activeChatId || undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "No se pudo contactar el asistente.")

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: cleanDisplayText(data.answer || "No pude generar una respuesta."),
        meta: undefined,
        sections: Array.isArray(data.sections) ? data.sections.filter(isAssistantSection).map(cleanSection) : [],
        suggestion: isAssistantSuggestion(data.suggestion) ? data.suggestion : undefined,
        checks: Array.isArray(data.checks) ? data.checks.filter(isAssistantCheck) : [],
      }

      if (typeof data.chatId === "string") setActiveChatId(data.chatId)
      setMessages((current) => [...current, assistantMessage])
      if (session?.user) void loadChatHistory()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Error desconocido."
      setError(message)
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "No pude responder en este momento. Intenta de nuevo en unos segundos.",
          meta: "Error de conexion",
        },
      ])
    } finally {
      setIsLoading(false)
      textareaRef.current?.focus()
    }
  }

  function useQuickPrompt(prompt: string) {
    setInput(prompt)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  function clearConversation() {
    setMessages(initialMessages)
    window.sessionStorage.removeItem(CHAT_STORAGE_KEY)
    setError("")
    setInput("")
    setActiveChatId("")
  }

  async function loadChatHistory() {
    setIsLoadingHistory(true)
    try {
      const response = await fetch("/api/chat-history?limit=30")
      if (!response.ok) return
      const data = await response.json()
      setChatHistory(Array.isArray(data.records) ? data.records : [])
    } finally {
      setIsLoadingHistory(false)
    }
  }

  async function openChat(chatId: string) {
    setIsLoadingHistory(true)
    try {
      const response = await fetch(`/api/chat-history/${chatId}`)
      const data = await response.json()
      if (!response.ok || !Array.isArray(data.messages)) return

      const restoredMessages = data.messages
        .map(normalizeStoredMessage)
        .filter((message: ChatMessage | undefined): message is ChatMessage => Boolean(message))

      setMessages(restoredMessages.length ? restoredMessages : initialMessages)
      setActiveChatId(chatId)
      setError("")
      setInput("")
    } finally {
      setIsLoadingHistory(false)
    }
  }

  async function deleteChat(chatId: string) {
    await fetch(`/api/chat-history/${chatId}`, { method: "DELETE" })
    if (activeChatId === chatId) clearConversation()
    await loadChatHistory()
  }

  function applySuggestion(suggestion: AssistantSuggestion) {
    const target = moduleRoutes[suggestion.module]
    window.sessionStorage.setItem(
      AUTOFILL_STORAGE_KEY,
      JSON.stringify({
        module: suggestion.module,
        fields: suggestion.fields,
        summary: suggestion.summary,
        mappings: suggestion.mappings,
      })
    )
    router.push(`${target.href}?autofill=1`)
  }

  function updateSuggestionField(messageId: string, field: string, value: string) {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId || !message.suggestion) return message

        return {
          ...message,
          suggestion: {
            ...message.suggestion,
            fields: {
              ...message.suggestion.fields,
              [field]: value,
            },
            mappings: message.suggestion.mappings?.map((mapping) =>
              mapping.field === field ? { ...mapping, value } : mapping
            ),
          },
        }
      })
    )
  }

  return (
    <ModuleShell
      title="Asistente IA"
      description="Interpreta enunciados financieros y convierte el problema en pasos de trabajo dentro de FinCalcPro."
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-h-[640px]">
          <CardHeader className="border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-3xl bg-primary text-primary-foreground">
                <Bot size={20} />
              </div>
              <div>
                <CardTitle>Chat financiero</CardTitle>
                <CardDescription>Explica el ejercicio, sugiere modulo y detalla el procedimiento.</CardDescription>
              </div>
              {messages.length > 1 ? (
                <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={clearConversation}>
                  Limpiar
                </Button>
              ) : null}
            </div>
          </CardHeader>

          <CardContent className="flex min-h-[520px] flex-col gap-4">
            <div className="flex-1 space-y-4 overflow-y-auto rounded-3xl border border-border/60 bg-muted/30 p-4">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" ? (
                    <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-3xl bg-primary text-primary-foreground">
                      <Bot size={16} />
                    </div>
                  ) : null}

                  <div
                    className={cn(
                      "max-w-[82%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border/60 bg-card text-card-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.sections?.length ? (
                      <div className="mt-3 grid gap-2">
                        {message.sections.map((section) => (
                          <section
                            key={`${message.id}-${section.title}`}
                            className="rounded-2xl border border-border/60 bg-muted/30 px-3 py-3"
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              {section.title}
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{section.body}</p>
                            {section.formula ? (
                              <div className="mt-2 overflow-x-auto rounded-2xl bg-background/70 px-3 py-2 text-foreground">
                                <BlockMath math={section.formula} />
                              </div>
                            ) : null}
                          </section>
                        ))}
                      </div>
                    ) : null}
                    {message.checks?.length ? (
                      <div className="mt-3 grid gap-2">
                        {message.checks.map((check) => (
                          <p
                            key={`${check.type}-${check.message}`}
                            className={cn(
                              "rounded-2xl border px-3 py-2 text-xs leading-5",
                              check.type === "warning"
                                ? "border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-200"
                                : "border-sky-300/70 bg-sky-50 text-sky-900 dark:border-sky-400/30 dark:bg-sky-950/30 dark:text-sky-200"
                            )}
                          >
                            {check.message}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    {message.meta ? (
                      <p
                        className={cn(
                          "mt-2 text-xs",
                          message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}
                      >
                        {message.meta}
                      </p>
                    ) : null}
                    {message.suggestion ? (
                      <div className="mt-3 rounded-2xl border border-border/70 bg-muted/40 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Autorrellenado sugerido
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                              {moduleRoutes[message.suggestion.module].label}
                            </p>
                            {message.suggestion.summary ? (
                              <p className="mt-1 text-xs text-muted-foreground">{message.suggestion.summary}</p>
                            ) : null}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => applySuggestion(message.suggestion!)}
                            className="self-start"
                          >
                            <ClipboardCheck />
                            Autorrellenar
                          </Button>
                        </div>

                        <div className="mt-3 grid gap-2">
                          {Object.entries(message.suggestion.fields).map(([field, value]) => {
                            const mapping = message.suggestion?.mappings?.find((item) => item.field === field)
                            return (
                              <label key={field} className="rounded-2xl bg-background/70 px-3 py-2 text-xs">
                                <span className="font-semibold">{mapping?.label ?? field}</span>
                                <input
                                  value={value}
                                  onChange={(event) => updateSuggestionField(message.id, field, event.target.value)}
                                  className="mt-2 h-9 w-full rounded-2xl border border-border/60 bg-card px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                                />
                                {mapping?.reason ? (
                                  <p className="mt-1 text-muted-foreground">{mapping.reason}</p>
                                ) : null}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {message.role === "user" ? (
                    <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-3xl bg-foreground text-background">
                      <UserRound size={16} />
                    </div>
                  ) : null}
                </article>
              ))}

              {isLoading ? (
                <div className="flex items-center gap-2 rounded-3xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="animate-spin" size={16} />
                  Analizando el enunciado financiero...
                </div>
              ) : null}
            </div>

            {error ? (
              <p className="rounded-3xl border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <form className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-card p-3 shadow-sm" onSubmit={submitMessage}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Escribe aqui tu problema financiero..."
                className="min-h-24 resize-none rounded-2xl border border-transparent bg-input/40 px-4 py-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Describe el ejercicio con valores, tasa, plazo y condiciones de pago.</p>
                <Button type="submit" disabled={isLoading || !input.trim()} size="lg">
                  {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
                  Enviar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <aside className="grid content-start gap-5">
          <Card size="sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Historial de chats</CardTitle>
                  <CardDescription>
                    {session?.user ? "Conversaciones guardadas en tu cuenta." : "Inicia sesion para guardar tus chats."}
                  </CardDescription>
                </div>
                <Button type="button" size="icon-sm" variant="outline" onClick={clearConversation}>
                  <MessageSquarePlus />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2">
              {!session?.user ? (
                <Button size="sm" onClick={() => authClient.signIn.social({ provider: "google" })}>
                  Iniciar sesion
                </Button>
              ) : isLoadingHistory && chatHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Cargando historial...</p>
              ) : chatHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aun no hay conversaciones guardadas.</p>
              ) : (
                chatHistory.map((chat) => (
                  <div key={chat.id} className="flex items-center gap-2 rounded-3xl border border-border/70 bg-muted/20 p-2">
                    <button
                      type="button"
                      onClick={() => openChat(chat.id)}
                      className={cn(
                        "min-w-0 flex-1 truncate rounded-2xl px-2 py-1.5 text-left text-sm font-medium transition hover:bg-muted",
                        activeChatId === chat.id ? "bg-primary/10 text-primary" : "text-foreground"
                      )}
                    >
                      {chat.title}
                    </button>
                    <Button type="button" size="icon-xs" variant="ghost" onClick={() => deleteChat(chat.id)}>
                      <Trash2 />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles size={16} />
                Ejemplos rapidos
              </CardTitle>
              <CardDescription>Usalos para probar el asistente.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => useQuickPrompt(prompt)}
                  className="rounded-3xl border border-border/70 bg-muted/30 px-3 py-3 text-left text-sm font-medium leading-6 transition hover:bg-muted"
                >
                  {prompt}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>Modulos relacionados</CardTitle>
              <CardDescription>Abre el modulo cuando el asistente indique el camino.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {moduleLinks.map((module) => (
                <Button key={module.href} asChild variant="outline" className="justify-start">
                  <Link href={module.href}>{module.label}</Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </ModuleShell>
  )
}

function isAssistantSuggestion(value: unknown): value is AssistantSuggestion {
  if (!value || typeof value !== "object") return false
  const suggestion = value as Partial<AssistantSuggestion>
  return (
    typeof suggestion.module === "string" &&
    suggestion.module in moduleRoutes &&
    !!suggestion.fields &&
    typeof suggestion.fields === "object"
  )
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false
  const message = value as Partial<ChatMessage>
  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string"
  )
}

function normalizeStoredMessage(value: unknown): ChatMessage | undefined {
  if (!value || typeof value !== "object") return undefined
  const source = value as Record<string, unknown>
  const role = source.role === "assistant" ? "assistant" : source.role === "user" ? "user" : undefined
  const content = typeof source.content === "string" ? source.content : ""
  const id = typeof source.id === "string" ? source.id : crypto.randomUUID()

  if (!role || !content) return undefined

  return {
    id,
    role,
    content,
    meta: typeof source.meta === "string" ? source.meta : undefined,
    sections: Array.isArray(source.sections) ? source.sections.filter(isAssistantSection).map(cleanSection) : [],
    suggestion: isAssistantSuggestion(source.suggestion) ? source.suggestion : undefined,
    checks: Array.isArray(source.checks) ? source.checks.filter(isAssistantCheck) : [],
  }
}

function isAssistantSection(value: unknown): value is AssistantSection {
  if (!value || typeof value !== "object") return false
  const section = value as Partial<AssistantSection>
  return typeof section.title === "string" && typeof section.body === "string"
}

function isAssistantCheck(value: unknown): value is AssistantCheck {
  if (!value || typeof value !== "object") return false
  const check = value as Partial<AssistantCheck>
  return (check.type === "warning" || check.type === "info") && typeof check.message === "string"
}

function cleanSection(section: AssistantSection): AssistantSection {
  return {
    ...section,
    body: cleanDisplayText(section.body),
  }
}

function cleanDisplayText(value: string) {
  const textWithoutFormulaLines = value
    .split(/\r?\n/)
    .filter((line) => !/\\(frac|cdot|times|approx)|\^\{|[A-Za-z]\s*=.*\\/.test(line))
    .join("\n")

  return textWithoutFormulaLines
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*/g, "")
    .replace(/^\s*[*-]\s+/gm, "• ")
    .replace(/\\cdot/g, "·")
    .replace(/\\times/g, "x")
    .replace(/\\approx/g, "≈")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1) / ($2)")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
