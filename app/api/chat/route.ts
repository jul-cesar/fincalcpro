import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { chatMessage, chatSession } from "@/db/schema"
import { buildChatTitle, ensureChatHistoryTables } from "@/lib/chat-history"
import { auth } from "@/lib/auth"

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models"

const systemInstruction = [
  "Eres el asistente financiero de FinCalcPro.",
  "Responde en espanol claro, academico y practico.",
  "Ayuda a identificar el modulo correcto de la aplicacion y explica donde colocar cada dato.",
  "Modulos disponibles: interes simple, interes compuesto, conversion de tasas, anualidades, amortizacion, VPN y TIR, flujo de caja.",
  "Cuando el enunciado tenga datos suficientes, muestra procedimiento, formula y resultado aproximado.",
  "Si faltan datos, pide solo los datos necesarios.",
  "No inventes valores.",
  "Devuelve SOLO JSON valido con esta forma:",
  "{ \"answer\": string, \"sections\": [{ \"title\": string, \"body\": string, \"formula\": string opcional }], \"suggestion\": { \"module\": string, \"fields\": object, \"summary\": string, \"mappings\": [{ \"field\": string, \"label\": string, \"value\": string, \"reason\": string }] } opcional, \"checks\": [{ \"type\": \"warning\" | \"info\", \"message\": string }] opcional }.",
  "Si hay datos suficientes, sections debe tener: Datos detectados, Modulo recomendado, Formula, Sustitucion, Resultado e Interpretacion.",
  "En Formula usa LaTeX sencillo sin delimitadores, por ejemplo A = \\frac{VF \\cdot i}{(1+i)^n - 1}.",
  "No uses Markdown en answer ni en body: no escribas **negritas**, listas con * ni codigo.",
  "No escribas comandos LaTeX en body. Todo LaTeX debe ir solo en formula.",
  "El campo answer debe ser un resumen breve de 1 a 3 frases. El desarrollo largo va en sections.",
  "Modulos validos: simple, compound, rates, annuity, amortization, project, cashflow.",
  "Campos validos por modulo:",
  "simple y compound: principal, rate, periods.",
  "rates: rate, sourceFrequency, targetFrequency.",
  "En rates, sourceFrequency y targetFrequency deben ser 1, 2, 4, 12 o 360.",
  "annuity: futureValue, rate, periods, timing. timing solo end o beginning.",
  "amortization: method, loan, rate, periods. method solo french, german o american.",
  "project: discountRate, flowA, flowB.",
  "cashflow: initial, payment, periods, growth, discountRate.",
  "Las tasas deben ir en porcentaje para la interfaz: usa 2.5, no 0.025.",
  "Todos los valores de fields deben ser strings."
].join("\n")

type ChatMessage = {
  role?: string
  content?: string
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

const allowedFields = {
  simple: ["principal", "rate", "periods"],
  compound: ["principal", "rate", "periods"],
  rates: ["rate", "sourceFrequency", "targetFrequency"],
  annuity: ["futureValue", "rate", "periods", "timing"],
  amortization: ["method", "loan", "rate", "periods"],
  project: ["discountRate", "flowA", "flowB"],
  cashflow: ["initial", "payment", "periods", "growth", "discountRate"],
} as const

type ModuleId = keyof typeof allowedFields

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const messages = normalizeMessages(body.messages)
    const message = typeof body.message === "string" ? body.message.trim() : ""
    const requestedChatId = typeof body.chatId === "string" ? body.chatId.trim() : ""
    const prompt = buildPrompt(messages, message)
    const session = await auth.api.getSession({ headers: request.headers })

    if (!prompt) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) {
      const localResult = localAssistantAnswer(prompt)
      const chatId = await persistChatExchange({
        requestedChatId,
        userId: session?.user?.id,
        userContent: message || messages.at(-1)?.content || prompt,
        assistantPayload: localResult,
      })

      return NextResponse.json({
        fallback: true,
        chatId,
        ...localResult,
      })
    }

    const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash"
    const response = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: "application/json",
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const detail = data?.error?.message || "Gemini request failed."
      if ([429, 500, 502, 503, 504].includes(response.status)) {
        const localResult = localAssistantAnswer(prompt)
        const chatId = await persistChatExchange({
          requestedChatId,
          userId: session?.user?.id,
          userContent: message || messages.at(-1)?.content || prompt,
          assistantPayload: localResult,
        })

        return NextResponse.json({
          fallback: true,
          provider: "local",
          model: "fallback",
          chatId,
          ...localResult,
        })
      }
      return NextResponse.json({ error: detail }, { status: response.status })
    }

    const parsedResult = parseAssistantResult(extractGeminiText(data))
    const checks = mergeChecks(
      parsedResult.checks,
      parsedResult.suggestion ? validateSuggestion(parsedResult.suggestion) : []
    )
    const assistantPayload = {
      answer: parsedResult.answer || "No pude generar una respuesta con la informacion enviada.",
      sections: parsedResult.sections,
      suggestion: parsedResult.suggestion,
      checks,
    }
    const chatId = await persistChatExchange({
      requestedChatId,
      userId: session?.user?.id,
      userContent: message || messages.at(-1)?.content || prompt,
      assistantPayload,
    })

    return NextResponse.json({
      ...assistantPayload,
      chatId,
      provider: "gemini",
      model,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "AI request failed." }, { status: 500 })
  }
}

type AssistantPayload = {
  answer: string
  sections?: unknown[]
  suggestion?: unknown
  checks?: unknown[]
}

async function persistChatExchange({
  requestedChatId,
  userId,
  userContent,
  assistantPayload,
}: {
  requestedChatId: string
  userId?: string
  userContent: string
  assistantPayload: AssistantPayload
}) {
  if (!userId) return undefined

  await ensureChatHistoryTables()

  let chatId = requestedChatId
  if (chatId) {
    const existing = await db
      .select({ id: chatSession.id })
      .from(chatSession)
      .where(and(eq(chatSession.id, chatId), eq(chatSession.userId, userId)))
      .limit(1)

    if (existing.length === 0) chatId = ""
  }

  if (!chatId) {
    chatId = crypto.randomUUID()
    await db.insert(chatSession).values({
      id: chatId,
      userId,
      title: buildChatTitle(userContent),
    })
  }

  const now = new Date()
  await db.insert(chatMessage).values([
    {
      id: crypto.randomUUID(),
      chatId,
      role: "user",
      content: userContent,
      sections: [],
      checks: [],
    },
    {
      id: crypto.randomUUID(),
      chatId,
      role: "assistant",
      content: assistantPayload.answer,
      sections: Array.isArray(assistantPayload.sections) ? assistantPayload.sections as Record<string, unknown>[] : [],
      suggestion: assistantPayload.suggestion && typeof assistantPayload.suggestion === "object"
        ? assistantPayload.suggestion as Record<string, unknown>
        : null,
      checks: Array.isArray(assistantPayload.checks) ? assistantPayload.checks as Record<string, unknown>[] : [],
    },
  ])

  await db
    .update(chatSession)
    .set({ updatedAt: now })
    .where(and(eq(chatSession.id, chatId), eq(chatSession.userId, userId)))

  return chatId
}

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const role = "role" in item ? String(item.role ?? "") : ""
    const content = "content" in item ? String(item.content ?? "").trim() : ""
    return content ? [{ role, content }] : []
  })
}

function buildPrompt(messages: ChatMessage[], message: string) {
  if (messages.length) {
    return messages
      .slice(-8)
      .map((item) => `${item.role === "assistant" ? "Asistente" : "Usuario"}: ${item.content}`)
      .join("\n")
  }

  return message
}

function extractGeminiText(data: unknown) {
  if (!data || typeof data !== "object" || !("candidates" in data) || !Array.isArray(data.candidates)) {
    return ""
  }

  return data.candidates
    .flatMap((candidate) => candidate?.content?.parts ?? [])
    .map((part) => part?.text)
    .filter((text): text is string => typeof text === "string")
    .join("\n")
    .trim()
}

function parseAssistantResult(text: string) {
  const fallback = { answer: text, sections: [], suggestion: undefined, checks: [] }
  if (!text) return fallback

  const clean = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "")

  try {
    const value = JSON.parse(clean)
    if (!value || typeof value !== "object") return fallback
    const answer = typeof value.answer === "string" ? cleanDisplayText(value.answer) : cleanDisplayText(text)
    const suggestion = sanitizeSuggestion(value.suggestion)
    return {
      answer,
      sections: sanitizeSections(value.sections),
      suggestion,
      checks: mergeChecks(sanitizeChecks(value.checks), suggestion ? validateSuggestion(suggestion) : []),
    }
  } catch {
    return fallback
  }
}

function sanitizeSections(value: unknown): AssistantSection[] {
  if (!Array.isArray(value)) return []

  return value.slice(0, 8).flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const source = item as Record<string, unknown>
    const title = String(source.title ?? "").trim()
    const body = cleanDisplayText(String(source.body ?? ""))
    const formula = typeof source.formula === "string" ? source.formula.trim() : ""
    return title && body ? [{ title, body, formula: formula || undefined }] : []
  })
}

function sanitizeChecks(value: unknown): AssistantCheck[] {
  if (!Array.isArray(value)) return []

  return value.slice(0, 6).flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const source = item as Record<string, unknown>
    const type = source.type === "warning" ? "warning" : "info"
    const message = String(source.message ?? "").trim()
    return message ? [{ type, message }] : []
  })
}

function sanitizeSuggestion(value: unknown) {
  if (!value || typeof value !== "object") return undefined

  const source = value as Record<string, unknown>
  const module = typeof source.module === "string" && source.module in allowedFields
    ? (source.module as ModuleId)
    : undefined
  if (!module) return undefined

  const sourceFields = source.fields && typeof source.fields === "object"
    ? (source.fields as Record<string, unknown>)
    : {}
  const fields: Record<string, string> = {}

  for (const field of allowedFields[module]) {
    const fieldValue = sourceFields[field]
    if (fieldValue === undefined || fieldValue === null) continue
    const normalized = normalizeFieldValue(module, field, fieldValue)
    if (normalized) fields[field] = normalized
  }

  if (!Object.keys(fields).length) return undefined

  return {
    module,
    fields,
    summary:
      typeof source.summary === "string" && source.summary.trim()
        ? source.summary.trim()
        : "El asistente preparo estos datos para el modulo recomendado.",
    mappings: sanitizeMappings(source.mappings),
  }
}

type SanitizedSuggestion = NonNullable<ReturnType<typeof sanitizeSuggestion>>

function validateSuggestion(suggestion: SanitizedSuggestion): AssistantCheck[] {
  const checks: AssistantCheck[] = []
  const { module, fields } = suggestion

  if ("rate" in fields) {
    const rate = Number(fields.rate)
    if (Number.isFinite(rate) && rate > 100) {
      checks.push({
        type: "warning",
        message: "La tasa detectada es mayor al 100%. Revisa si se escribio como porcentaje o decimal.",
      })
    }
    if (Number.isFinite(rate) && rate > 0 && rate < 1) {
      checks.push({
        type: "info",
        message: "La tasa detectada es menor que 1%. Si querias 2.5%, escribe 2.5 y no 0.025.",
      })
    }
  }

  if ((module === "annuity" || module === "amortization" || module === "simple" || module === "compound") && "periods" in fields) {
    const periods = Number(fields.periods)
    const rate = Number("rate" in fields ? fields.rate : "")
    if (Number.isFinite(periods) && periods <= 0) {
      checks.push({ type: "warning", message: "El numero de periodos debe ser mayor que cero." })
    }
    if (Number.isFinite(periods) && periods <= 5 && Number.isFinite(rate) && rate > 1.5) {
      checks.push({
        type: "info",
        message: "La tasa parece periodica y el plazo tiene pocos periodos. Confirma si el plazo esta en meses, anos o cuotas.",
      })
    }
  }

  if (module === "annuity" && fields.timing === "beginning") {
    checks.push({
      type: "info",
      message: "Se interpretara como anualidad anticipada porque los pagos son al inicio del periodo.",
    })
  }

  return checks
}

function mergeChecks(...groups: AssistantCheck[][]) {
  const seen = new Set<string>()
  return groups.flat().filter((check) => {
    const key = `${check.type}:${check.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizeFieldValue(module: ModuleId, field: string, value: unknown) {
  const text = String(value).trim()
  if (!text) return ""
  if (field === "timing") return text === "beginning" ? "beginning" : text === "end" ? "end" : ""
  if (field === "method") return ["french", "german", "american"].includes(text) ? text : ""
  if (module === "rates" && (field === "sourceFrequency" || field === "targetFrequency")) return text
  if (module === "project" && (field === "flowA" || field === "flowB")) return text
  return text.replace(",", ".")
}

function sanitizeMappings(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.slice(0, 8).flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const source = item as Record<string, unknown>
  const field = String(source.field ?? "").trim()
  const label = cleanDisplayText(String(source.label ?? ""))
  const mappedValue = cleanDisplayText(String(source.value ?? ""))
  const reason = cleanDisplayText(String(source.reason ?? ""))
  return field && label && mappedValue && reason ? [{ field, label, value: mappedValue, reason }] : []
  })
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
    .replace(/[ \t]+/g, " ")
    .trim()
}

function localAssistantAnswer(prompt: string) {
  const normalized = prompt.toLowerCase()

  if (normalized.includes("8500000") || normalized.includes("8.500.000") || normalized.includes("anualidad")) {
    return {
      answer: [
        "Para ese tipo de ejercicio usa el modulo Anualidades.",
        "",
        "Coloca el valor futuro objetivo en el campo Valor futuro, la tasa mensual en Tasa por periodo y el plazo en Numero de periodos.",
        "Si los depositos son al final de cada mes, selecciona Final de cada periodo.",
        "",
        "La formula de anualidad vencida es A = VF * i / ((1 + i)^n - 1). Con VF = 8.500.000, i = 0,025 y n = 24, el deposito mensual aproximado es $262.759."
      ].join("\n"),
      sections: [
        { title: "Datos detectados", body: "Valor futuro objetivo: 8.500.000. Tasa mensual: 2,5%. Periodos: 24. Pagos al final de cada mes." },
        { title: "Modulo recomendado", body: "Usa Anualidades porque se busca un deposito periodico para alcanzar un valor futuro." },
        { title: "Formula", body: "Anualidad vencida para valor futuro.", formula: String.raw`A = \frac{VF \cdot i}{(1+i)^n - 1}` },
        { title: "Sustitucion", body: "Se reemplaza VF = 8.500.000, i = 0,025 y n = 24.", formula: String.raw`A = \frac{8500000 \cdot 0.025}{(1+0.025)^{24} - 1}` },
        { title: "Resultado", body: "El deposito mensual aproximado es $262.759." },
        { title: "Interpretacion", body: "Si depositas ese valor al final de cada mes durante 24 meses, la cuenta llega aproximadamente a 8.500.000 con una tasa mensual de 2,5%." },
      ],
      suggestion: {
        module: "annuity",
        fields: {
          futureValue: "8500000",
          rate: "2.5",
          periods: "24",
          timing: "end",
        },
        summary: "Datos detectados para calcular un deposito periodico vencido.",
        mappings: [
          { field: "futureValue", label: "Valor futuro objetivo", value: "8500000", reason: "Es la meta que se quiere reunir." },
          { field: "rate", label: "Tasa por periodo (%)", value: "2.5", reason: "La tasa indicada es mensual." },
          { field: "periods", label: "Numero de periodos", value: "24", reason: "Dos anos equivalen a 24 meses." },
          { field: "timing", label: "Momento del deposito", value: "end", reason: "El enunciado dice al final de cada mes." },
        ],
      },
      checks: [
        { type: "info", message: "La tasa se interpreta como mensual porque el enunciado habla de depositos mensuales." },
      ],
    }
  }

  return {
    answer: [
      "Puedo ayudarte a interpretar el enunciado y elegir el modulo correcto.",
      "Enviame el valor presente o futuro, tasa, periodos y si los pagos son al inicio o al final del periodo.",
      "Con esos datos te indico donde escribir cada valor y como leer el resultado."
    ].join("\n"),
    sections: [
      { title: "Siguiente paso", body: "Envia el enunciado completo con valor, tasa, plazo y momento de pago si aplica." },
    ],
  }
}
