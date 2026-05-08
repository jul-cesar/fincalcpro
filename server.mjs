import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

loadLocalEnv();

const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "127.0.0.1";
const providerPreference = normalizeProvider(process.env.AI_PROVIDER);
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const openaiModel = process.env.OPENAI_MODEL || "gpt-5.2";
const geminiApiKey = envValue("GEMINI_API_KEY");
const openaiApiKey = envValue("OPENAI_API_KEY");
const gemini = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

const assistantInstructions = [
  "Eres el asistente financiero de FinCalcPro.",
  "Responde en espanol claro, con tono academico y practico.",
  "Ayuda al usuario a identificar el modulo correcto de FinCalcPro.",
  "Cuando haya datos suficientes, explica donde poner cada dato, el procedimiento y el resultado esperado.",
  "Modulos disponibles: Interes simple, Interes compuesto, Conversion de tasas, Anualidades y Pago, Amortizacion, VPN y TIR, Flujo de caja.",
  "No inventes datos faltantes. Si faltan datos, pide exactamente lo necesario.",
  "Usa pasos breves y evita respuestas largas innecesarias."
].join("\n");

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "spa"
});

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/chat") {
    await handleChat(req, res);
    return;
  }

  vite.middlewares(req, res);
});

server.listen(port, host, () => {
  const activeProvider = resolveProvider();
  console.log(`FinCalcPro running at http://${host}:${port}/`);
  if (activeProvider === "gemini") {
    console.log(`AI chat enabled with Gemini model ${geminiModel}.`);
  } else if (activeProvider === "openai") {
    console.log(`AI chat enabled with OpenAI model ${openaiModel}.`);
  } else {
    console.log("AI chat fallback mode: configure GEMINI_API_KEY or OPENAI_API_KEY to enable cloud AI.");
  }
});

async function handleChat(req, res) {
  try {
    const body = await readJson(req);
    const message = String(body.message || "").trim();

    if (!message) {
      sendJson(res, 400, { error: "Message is required." });
      return;
    }

    const activeProvider = resolveProvider();
    if (!activeProvider) {
      sendJson(res, 200, { fallback: true, answer: "" });
      return;
    }

    const answer = activeProvider === "gemini"
      ? await askGemini(message)
      : await askOpenAi(message);

    sendJson(res, 200, {
      answer: answer || "No pude generar una respuesta.",
      provider: activeProvider,
      model: activeProvider === "gemini" ? geminiModel : openaiModel
    });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "AI request failed." });
  }
}

async function askGemini(message) {
  const response = await gemini.models.generateContent({
    model: geminiModel,
    contents: message,
    config: {
      systemInstruction: assistantInstructions
    }
  });
  return response.text;
}

async function askOpenAi(message) {
  const response = await openai.responses.create({
    model: openaiModel,
    instructions: assistantInstructions,
    input: message
  });
  return response.output_text;
}

function resolveProvider() {
  if (providerPreference === "gemini") return gemini ? "gemini" : null;
  if (providerPreference === "openai") return openai ? "openai" : null;
  if (gemini) return "gemini";
  if (openai) return "openai";
  return null;
}

function normalizeProvider(value) {
  const provider = String(value || "auto").trim().toLowerCase();
  return ["auto", "gemini", "openai"].includes(provider) ? provider : "auto";
}

function envValue(name) {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith("your_") || value.startsWith("tu_")) return "";
  return value;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 32_000) {
        reject(new Error("Payload too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}
