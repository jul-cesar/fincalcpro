import {
  ArrowDownToLine,
  BookOpenCheck,
  Bot,
  ChartNoAxesCombined,
  Download,
  Landmark,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  UserRound,
  WalletCards
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import logoUrl from "../assets/fincalcpro-logo.svg";
import { BarChart, LineChart, MultiLineChart } from "./components/Charts";
import { AnnuityDiagram, CashflowDiagram } from "./components/Diagrams";
import { DataTable } from "./components/DataTable";
import {
  amortization,
  annuityPayment,
  cashflowSeries,
  compoundInterest,
  convertEffectiveRate,
  internalRateOfReturn,
  netPresentValue,
  parseFlows,
  simpleInterest
} from "./lib/finance";
import { asPercent, formatCurrency, formatNumber } from "./lib/format";
import { answerFinancialPrompt, type AssistantSuggestion } from "./lib/assistant";
import type { FormState, ModuleId, SavedScenario, TableRow } from "./types";

const STORAGE_KEY = "fincalcpro-react-scenarios-v1";
const DRAFT_KEY = "fincalcpro-react-draft-v1";

const modules: Array<{ id: ModuleId; label: string; icon: React.ReactNode }> = [
  { id: "dashboard", label: "Panel", icon: <Sparkles size={17} /> },
  { id: "assistant", label: "Asistente IA", icon: <Bot size={17} /> },
  { id: "simple", label: "Interes simple", icon: <ChartNoAxesCombined size={17} /> },
  { id: "compound", label: "Interes compuesto", icon: <ChartNoAxesCombined size={17} /> },
  { id: "rates", label: "Conversion de tasas", icon: <RotateCcw size={17} /> },
  { id: "annuity", label: "Anualidades", icon: <WalletCards size={17} /> },
  { id: "amortization", label: "Amortizacion", icon: <Landmark size={17} /> },
  { id: "project", label: "VPN y TIR", icon: <BookOpenCheck size={17} /> },
  { id: "cashflow", label: "Flujo de caja", icon: <ArrowDownToLine size={17} /> }
];

const moduleTitles: Record<ModuleId, string> = {
  dashboard: "Panel de trabajo",
  assistant: "Asistente IA financiero",
  simple: "Interes simple",
  compound: "Interes compuesto",
  rates: "Conversion de tasas",
  annuity: "Anualidades y Pago",
  amortization: "Amortizacion",
  project: "VPN, TIR y alternativas",
  cashflow: "Flujo de caja"
};

const defaultState: FormState = {
  simple: { principal: 5_000_000, rate: 2.5, periods: 12 },
  compound: { principal: 5_000_000, rate: 2.5, periods: 12 },
  rates: { rate: 3, sourceFrequency: 12, targetFrequency: 1 },
  annuity: { futureValue: 8_500_000, rate: 2.5, periods: 24, timing: "end" },
  amortization: { method: "french", loan: 12_000_000, rate: 1.8, periods: 12 },
  project: {
    discountRate: 12,
    flowA: "-10000000, 3200000, 3400000, 3600000, 4000000",
    flowB: "-8500000, 2500000, 3000000, 3200000, 3600000"
  },
  cashflow: { initial: -10_000_000, payment: 3_000_000, periods: 5, growth: 4, discountRate: 12 }
};

type CalculatedModule = {
  rows: TableRow[];
  exportRows: TableRow[];
};

type Toast = { id: number; message: string } | null;
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: "Gemini" | "OpenAI" | "Local";
  suggestion?: AssistantSuggestion;
  suggestedModule?: ModuleId;
};

const numericSchema = z.number().finite();
const nonNegativeSchema = numericSchema.nonnegative();
const positiveIntegerSchema = numericSchema.int().positive();

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>(() => {
    const hash = window.location.hash.replace("#", "") as ModuleId;
    return moduleTitles[hash] ? hash : "dashboard";
  });
  const [formState, setFormState] = useState<FormState>(() => loadDraft());
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>(() => loadScenarios());
  const [guidedFill, setGuidedFill] = useState<AssistantSuggestion | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const results = useMemo(() => calculateState(formState), [formState]);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(formState));
  }, [formState]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedScenarios));
  }, [savedScenarios]);

  useEffect(() => {
    window.history.replaceState(null, "", `#${activeModule}`);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeModule]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function notify(message: string) {
    setToast({ id: Date.now(), message });
  }

  function updateForm<K extends keyof FormState, F extends keyof FormState[K]>(
    section: K,
    field: F,
    value: FormState[K][F]
  ) {
    setFormState((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value
      }
    }));
  }

  function resetData() {
    setFormState(defaultState);
    setGuidedFill(null);
    notify("Datos restablecidos.");
  }

  function saveScenario() {
    const scenario: SavedScenario = {
      id: String(Date.now()),
      name: `${moduleTitles[activeModule]} - ${new Date().toLocaleString("es-CO")}`,
      module: activeModule,
      state: formState
    };
    setSavedScenarios((current) => [scenario, ...current].slice(0, 10));
    notify("Escenario guardado.");
  }

  function restoreScenario(id: string) {
    const scenario = savedScenarios.find((item) => item.id === id);
    if (!scenario) return;
    setFormState(scenario.state);
    setActiveModule(scenario.module);
    notify("Escenario cargado.");
  }

  function exportCsv() {
    if (activeModule === "dashboard" || activeModule === "assistant") {
      notify("Abre un modulo de calculo para exportar.");
      return;
    }

    const rows = results[activeModule]?.exportRows ?? [];
    if (!rows.length) {
      notify("No hay datos exportables.");
      return;
    }

    const csv = rowsToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fincalcpro-${activeModule}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notify("CSV generado.");
  }

  function applyAssistantSuggestion(suggestion: AssistantSuggestion) {
    setFormState((current) => ({
      ...current,
      [suggestion.module]: {
        ...current[suggestion.module],
        ...suggestion.fields
      }
    }));
    setGuidedFill(suggestion);
    setActiveModule(suggestion.module);
    notify(`Autollenado aplicado en ${moduleTitles[suggestion.module]}.`);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card" data-tour="brand">
          <img src={logoUrl} alt="FinCalcPro - Ingenieria economica" />
        </div>

        <nav className="module-nav" data-tour="module-nav" aria-label="Modulos financieros">
          {modules.map((module, index) => (
            <button
              key={module.id}
              className={`nav-item ${activeModule === module.id ? "active" : ""}`}
              type="button"
              onClick={() => setActiveModule(module.id)}
            >
              <span className="nav-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="nav-icon">{module.icon}</span>
              <span>{module.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Simulador financiero web integral</p>
            <h1>{moduleTitles[activeModule]}</h1>
          </div>
          <div className="top-actions" data-tour="top-actions">
            <TourGuide activeModule={activeModule} setActiveModule={setActiveModule} />
            <button className="soft-button" type="button" onClick={saveScenario}>
              <Save size={17} /> Guardar escenario
            </button>
            <button className="soft-button" type="button" onClick={exportCsv}>
              <Download size={17} /> Exportar CSV
            </button>
            <button className="primary-button" type="button" onClick={resetData}>
              <RotateCcw size={17} /> Restablecer
            </button>
          </div>
        </header>

        {activeModule === "dashboard" && (
          <Dashboard
            savedScenarios={savedScenarios}
            onClear={() => {
              setSavedScenarios([]);
              notify("Escenarios eliminados.");
            }}
            onRestore={restoreScenario}
          />
        )}

        {activeModule === "assistant" && (
          <AssistantModule onApplySuggestion={applyAssistantSuggestion} onOpenModule={setActiveModule} />
        )}

        {guidedFill && activeModule === guidedFill.module && (
          <AutofillExplanation suggestion={guidedFill} onClose={() => setGuidedFill(null)} />
        )}

        {activeModule === "simple" && (
          <SimpleModule state={formState.simple} update={updateForm} result={results.simple} />
        )}
        {activeModule === "compound" && (
          <CompoundModule state={formState.compound} update={updateForm} result={results.compound} />
        )}
        {activeModule === "rates" && (
          <RatesModule state={formState.rates} update={updateForm} result={results.rates} />
        )}
        {activeModule === "annuity" && (
          <AnnuityModule state={formState.annuity} update={updateForm} result={results.annuity} />
        )}
        {activeModule === "amortization" && (
          <AmortizationModule state={formState.amortization} update={updateForm} result={results.amortization} />
        )}
        {activeModule === "project" && (
          <ProjectModule state={formState.project} update={updateForm} result={results.project} />
        )}
        {activeModule === "cashflow" && (
          <CashflowModule state={formState.cashflow} update={updateForm} result={results.cashflow} />
        )}
      </main>

      {toast && <div className="toast show">{toast.message}</div>}
    </div>
  );
}

function Dashboard({
  savedScenarios,
  onClear,
  onRestore
}: {
  savedScenarios: SavedScenario[];
  onClear: () => void;
  onRestore: (id: string) => void;
}) {
  return (
    <section className="module-page">
      <div className="dashboard-grid">
        <Metric label="Modulos activos" value="8" text="Calculo, chat, evaluacion, tablas y visualizacion financiera." />
        <Metric label="Motor" value="IA + Decimal" text="Agente conversacional y formulas auditables con precision decimal." />
        <Metric label="Escenarios guardados" value={String(savedScenarios.length)} text="Datos persistentes en este navegador." />
      </div>

      <section className="workspace-band">
        <div>
          <h2>Tablero del prototipo</h2>
          <p>
            FinCalcPro ahora funciona como una aplicacion moderna con componentes React, motor financiero separado,
            validaciones, tablas profesionales, graficas, tutorial guiado y chat financiero con IA.
          </p>
        </div>
        <div className="capability-list">
          <span>Asistente IA para interpretar enunciados</span>
          <span>Interes simple y compuesto</span>
          <span>Conversion equivalente de tasas</span>
          <span>Anualidades y funcion Pago</span>
          <span>Amortizacion francesa, alemana y americana</span>
          <span>VPN, TIR y sensibilidad</span>
          <span>Diagramas financieros SVG</span>
        </div>
      </section>

      <section className="saved-panel">
        <div className="panel-heading">
          <h2>Escenarios</h2>
          <button className="text-button" type="button" onClick={onClear}>
            Limpiar
          </button>
        </div>
        {savedScenarios.length ? (
          <div className="saved-list">
            {savedScenarios.map((scenario) => (
              <article className="saved-item" key={scenario.id}>
                <div>
                  <strong>{scenario.name}</strong>
                  <small>{moduleTitles[scenario.module]}</small>
                </div>
                <button className="soft-button" type="button" onClick={() => onRestore(scenario.id)}>
                  Cargar
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">No hay escenarios guardados todavia.</div>
        )}
      </section>
    </section>
  );
}

function Metric({ label, value, text }: { label: string; value: string; text: string }) {
  return (
    <article className="metric-panel">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{text}</p>
    </article>
  );
}

function AssistantModule({
  onApplySuggestion,
  onOpenModule
}: {
  onApplySuggestion: (suggestion: AssistantSuggestion) => void;
  onOpenModule: (module: ModuleId) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hola, soy el asistente financiero de FinCalcPro. Puedes escribirme un enunciado completo y te dire que modulo usar, donde colocar cada dato, el procedimiento y el resultado cuando haya datos suficientes."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    const localResponse = answerFinancialPrompt(message);
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: message };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      const data = (await response.json()) as {
        answer?: string;
        fallback?: boolean;
        error?: string;
        provider?: "gemini" | "openai";
      };
      const useLocal = !response.ok || data.fallback || !data.answer;
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          source: useLocal ? "Local" : data.provider === "gemini" ? "Gemini" : "OpenAI",
          content: useLocal ? localResponse.answer : data.answer!,
          suggestion: localResponse.suggestion,
          suggestedModule: localResponse.suggestedModule
        }
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          source: "Local",
          content: localResponse.answer,
          suggestion: localResponse.suggestion,
          suggestedModule: localResponse.suggestedModule
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  const examples = [
    "Cuanto debo depositar al final de cada mes durante dos años al 2,5% mensual para reunir 8.500.000",
    "Tengo dos alternativas de inversion, quiero calcular VPN y TIR",
    "Necesito una tabla de amortizacion para un prestamo"
  ];

  return (
    <section className="assistant-layout" data-tour="assistant-chat">
      <div className="assistant-panel">
        <div className="assistant-header">
          <div>
            <span>Agente financiero</span>
            <h2>Chat con IA para resolver ejercicios</h2>
          </div>
          <Bot size={30} />
        </div>

        <div className="chat-window">
          {messages.map((message) => (
            <article key={message.id} className={`chat-message ${message.role}`}>
              <div className="chat-avatar">{message.role === "assistant" ? <Bot size={18} /> : <UserRound size={18} />}</div>
              <div className="chat-bubble">
                {message.source && <small>{message.source === "Local" ? "Respuesta local" : `Respuesta con ${message.source}`}</small>}
                <p>{message.content}</p>
                {message.suggestion && <AssistantAutofillPlan suggestion={message.suggestion} />}
                <div className="assistant-actions">
                  {message.suggestion && (
                    <button className="primary-button" type="button" onClick={() => onApplySuggestion(message.suggestion!)}>
                      <Sparkles size={17} /> Autollenar y calcular
                    </button>
                  )}
                  {!message.suggestion && message.suggestedModule && message.suggestedModule !== "assistant" && (
                    <button className="soft-button" type="button" onClick={() => onOpenModule(message.suggestedModule!)}>
                      Abrir {moduleTitles[message.suggestedModule]}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
          {loading && (
            <article className="chat-message assistant">
              <div className="chat-avatar"><Bot size={18} /></div>
              <div className="chat-bubble"><p>Analizando el problema financiero...</p></div>
            </article>
          )}
        </div>

        <form className="chat-input" onSubmit={submitMessage}>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Escribe aqui tu problema financiero..."
            rows={3}
          />
          <button className="primary-button" type="submit" disabled={loading}>
            <Send size={17} /> Enviar
          </button>
        </form>
      </div>

      <aside className="assistant-side">
        <h3>Ejemplos rapidos</h3>
        {examples.map((example) => (
          <button key={example} className="example-button" type="button" onClick={() => setInput(example)}>
            {example}
          </button>
        ))}
      </aside>
    </section>
  );
}

function AssistantAutofillPlan({ suggestion }: { suggestion: AssistantSuggestion }) {
  return (
    <div className="autofill-plan">
      <div className="autofill-plan-header">
        <Sparkles size={16} />
        <strong>Plan de autollenado</strong>
        <span>{moduleTitles[suggestion.module]}</span>
      </div>
      <p>{suggestion.summary}</p>
      <div className="field-map-list">
        {suggestion.mappings.map((mapping) => (
          <div className="field-map" key={`${suggestion.module}-${mapping.field}`}>
            <div>
              <strong>{mapping.label}</strong>
              <span>{mapping.value}</span>
            </div>
            <p>{mapping.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AutofillExplanation({
  suggestion,
  onClose
}: {
  suggestion: AssistantSuggestion;
  onClose: () => void;
}) {
  return (
    <section className="autofill-explanation" data-tour="assistant-autofill">
      <div className="autofill-copy">
        <span>Autollenado del asistente</span>
        <h2>{moduleTitles[suggestion.module]}</h2>
        <p>{suggestion.summary} El calculo se actualiza automaticamente con estos valores.</p>
      </div>
      <div className="field-map-list compact">
        {suggestion.mappings.map((mapping) => (
          <div className="field-map" key={`active-${suggestion.module}-${mapping.field}`}>
            <div>
              <strong>{mapping.label}</strong>
              <span>{mapping.value}</span>
            </div>
            <p>{mapping.reason}</p>
          </div>
        ))}
      </div>
      <button className="soft-button" type="button" onClick={onClose}>
        Ocultar explicacion
      </button>
    </section>
  );
}

function SimpleModule({
  state,
  update,
  result
}: {
  state: FormState["simple"];
  update: AppUpdate;
  result: ReturnType<typeof calculateState>["simple"];
}) {
  return (
    <section className="module-page">
      <div className="form-panel" data-tour="input-form">
        <NumberField label="Capital inicial" value={state.principal} onChange={(value) => update("simple", "principal", value)} />
        <NumberField label="Tasa por periodo (%)" value={state.rate} onChange={(value) => update("simple", "rate", value)} />
        <NumberField label="Numero de periodos" value={state.periods} onChange={(value) => update("simple", "periods", value)} />
        <ValidationMessage valid={nonNegativeSchema.safeParse(state.principal).success && nonNegativeSchema.safeParse(state.periods).success} />
      </div>
      <ResultAndSteps result={result.summary} steps={result.steps} />
      <LineChart title="Evolucion del monto simple" values={result.series} color="#0f766e" />
    </section>
  );
}

function CompoundModule({
  state,
  update,
  result
}: {
  state: FormState["compound"];
  update: AppUpdate;
  result: ReturnType<typeof calculateState>["compound"];
}) {
  return (
    <section className="module-page">
      <div className="form-panel" data-tour="input-form">
        <NumberField label="Capital inicial" value={state.principal} onChange={(value) => update("compound", "principal", value)} />
        <NumberField label="Tasa por periodo (%)" value={state.rate} onChange={(value) => update("compound", "rate", value)} />
        <NumberField label="Numero de periodos" value={state.periods} onChange={(value) => update("compound", "periods", value)} />
      </div>
      <ResultAndSteps result={result.summary} steps={result.steps} />
      <div data-tour="growth-chart">
        <LineChart title="Crecimiento compuesto" values={result.series} color="#2563eb" />
      </div>
    </section>
  );
}

function RatesModule({
  state,
  update,
  result
}: {
  state: FormState["rates"];
  update: AppUpdate;
  result: ReturnType<typeof calculateState>["rates"];
}) {
  return (
    <section className="module-page">
      <div className="form-panel" data-tour="input-form">
        <NumberField label="Tasa efectiva origen (%)" value={state.rate} onChange={(value) => update("rates", "rate", value)} />
        <SelectField
          label="Periodos origen por ano"
          value={state.sourceFrequency}
          onChange={(value) => update("rates", "sourceFrequency", Number(value))}
          options={frequencyOptions}
        />
        <SelectField
          label="Periodos destino por ano"
          value={state.targetFrequency}
          onChange={(value) => update("rates", "targetFrequency", Number(value))}
          options={frequencyOptions}
        />
      </div>
      <ResultAndSteps result={result.summary} steps={result.steps} />
    </section>
  );
}

function AnnuityModule({
  state,
  update,
  result
}: {
  state: FormState["annuity"];
  update: AppUpdate;
  result: ReturnType<typeof calculateState>["annuity"];
}) {
  return (
    <section className="module-page">
      <div className="form-panel" data-tour="annuity-form">
        <NumberField label="Valor futuro objetivo" value={state.futureValue} onChange={(value) => update("annuity", "futureValue", value)} />
        <NumberField label="Tasa por periodo (%)" value={state.rate} onChange={(value) => update("annuity", "rate", value)} />
        <NumberField label="Numero de periodos" value={state.periods} onChange={(value) => update("annuity", "periods", value)} />
        <SelectField
          label="Momento del deposito"
          value={state.timing}
          onChange={(value) => update("annuity", "timing", value as FormState["annuity"]["timing"])}
          options={[
            { label: "Final de cada periodo", value: "end" },
            { label: "Inicio de cada periodo", value: "beginning" }
          ]}
        />
      </div>
      <div data-tour="annuity-result">
        <ResultAndSteps result={result.summary} steps={result.steps} />
      </div>
      <AnnuityDiagram payment={result.payment} futureValue={state.futureValue} periods={state.periods} timing={state.timing} />
      <DataTable rows={result.rows} />
    </section>
  );
}

function AmortizationModule({
  state,
  update,
  result
}: {
  state: FormState["amortization"];
  update: AppUpdate;
  result: ReturnType<typeof calculateState>["amortization"];
}) {
  return (
    <section className="module-page">
      <div className="form-panel" data-tour="amortization-form">
        <SelectField
          label="Sistema"
          value={state.method}
          onChange={(value) => update("amortization", "method", value as FormState["amortization"]["method"])}
          options={[
            { label: "Frances - cuota fija", value: "french" },
            { label: "Aleman - abono fijo", value: "german" },
            { label: "Americano - intereses periodicos", value: "american" }
          ]}
        />
        <NumberField label="Monto del prestamo" value={state.loan} onChange={(value) => update("amortization", "loan", value)} />
        <NumberField label="Tasa por periodo (%)" value={state.rate} onChange={(value) => update("amortization", "rate", value)} />
        <NumberField label="Numero de cuotas" value={state.periods} onChange={(value) => update("amortization", "periods", value)} />
      </div>
      <ResultPanel items={result.summary} title="Resumen del credito" />
      <BarChart
        title="Interes por periodo"
        labels={result.rawRows.map((row) => String(row.period))}
        values={result.rawRows.map((row) => row.interest)}
        colors={result.rawRows.map(() => "#b45309")}
      />
      <div data-tour="amortization-table">
        <DataTable rows={result.rows} />
      </div>
    </section>
  );
}

function ProjectModule({
  state,
  update,
  result
}: {
  state: FormState["project"];
  update: AppUpdate;
  result: ReturnType<typeof calculateState>["project"];
}) {
  return (
    <section className="module-page">
      <div className="form-panel" data-tour="input-form">
        <NumberField label="Tasa de oportunidad (%)" value={state.discountRate} onChange={(value) => update("project", "discountRate", value)} />
        <TextField label="Alternativa A" value={state.flowA} onChange={(value) => update("project", "flowA", value)} />
        <TextField label="Alternativa B" value={state.flowB} onChange={(value) => update("project", "flowB", value)} />
      </div>
      <div data-tour="project-result">
        <ResultAndSteps result={result.summary} steps={result.steps} />
      </div>
      <BarChart title="VPN por alternativa" labels={["A", "B"]} values={[result.npvA, result.npvB]} colors={["#0f766e", "#2563eb"]} />
      <div data-tour="sensitivity-chart">
        <MultiLineChart
          title="Sensibilidad del VPN por tasa"
          labels={result.sensitivity.labels}
          series={[
            { label: "Alternativa A", values: result.sensitivity.a, color: "#0f766e" },
            { label: "Alternativa B", values: result.sensitivity.b, color: "#2563eb" }
          ]}
        />
      </div>
    </section>
  );
}

function CashflowModule({
  state,
  update,
  result
}: {
  state: FormState["cashflow"];
  update: AppUpdate;
  result: ReturnType<typeof calculateState>["cashflow"];
}) {
  return (
    <section className="module-page">
      <div className="form-panel" data-tour="input-form">
        <NumberField label="Inversion inicial" value={state.initial} onChange={(value) => update("cashflow", "initial", value)} />
        <NumberField label="Ingreso periodico" value={state.payment} onChange={(value) => update("cashflow", "payment", value)} />
        <NumberField label="Periodos" value={state.periods} onChange={(value) => update("cashflow", "periods", value)} />
        <NumberField label="Crecimiento por periodo (%)" value={state.growth} onChange={(value) => update("cashflow", "growth", value)} />
        <NumberField label="Tasa de descuento (%)" value={state.discountRate} onChange={(value) => update("cashflow", "discountRate", value)} />
      </div>
      <CashflowDiagram flows={result.flows} />
      <ResultPanel items={result.summary} title="Indicadores del flujo" />
      <DataTable rows={result.rows} />
    </section>
  );
}

function ResultAndSteps({ result, steps }: { result: Array<ResultItem>; steps: string[] }) {
  return (
    <div className="result-layout" data-tour="result-steps">
      <ResultPanel title="Resultado" items={result} />
      <section className="steps-panel">
        <h2>Procedimiento</h2>
        <ol>
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}

type ResultItem = { label: string; value: string; tone?: "positive" | "negative" };

function ResultPanel({ title, items }: { title: string; items: ResultItem[] }) {
  return (
    <section className="result-panel">
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item.label}>
            <span>{item.label}</span>
            <strong className={item.tone ?? ""}>{item.value}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      {label}
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      {label}
      <input type="text" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string | number;
  options: Array<{ label: string; value: string | number }>;
  onChange: (value: string | number) => void;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ValidationMessage({ valid }: { valid: boolean }) {
  if (valid) return null;
  return <p className="validation">Revisa los datos ingresados antes de interpretar el resultado.</p>;
}

const frequencyOptions = [
  { label: "Anual", value: 1 },
  { label: "Semestral", value: 2 },
  { label: "Trimestral", value: 4 },
  { label: "Mensual", value: 12 },
  { label: "Diaria", value: 360 }
];

type AppUpdate = <K extends keyof FormState, F extends keyof FormState[K]>(
  section: K,
  field: F,
  value: FormState[K][F]
) => void;

function calculateState(state: FormState) {
  const simple = simpleInterest(state.simple.principal, state.simple.rate, state.simple.periods);
  const compound = compoundInterest(state.compound.principal, state.compound.rate, state.compound.periods);
  const rates = convertEffectiveRate(state.rates.rate, state.rates.sourceFrequency, state.rates.targetFrequency);
  const annuity = annuityPayment(state.annuity.futureValue, state.annuity.rate, state.annuity.periods, state.annuity.timing);
  const amort = amortization(state.amortization.method, state.amortization.loan, state.amortization.rate, state.amortization.periods);
  const flowA = parseFlows(state.project.flowA);
  const flowB = parseFlows(state.project.flowB);
  const discount = state.project.discountRate / 100;
  const npvA = netPresentValue(flowA, discount);
  const npvB = netPresentValue(flowB, discount);
  const irrA = internalRateOfReturn(flowA);
  const irrB = internalRateOfReturn(flowB);
  const flows = cashflowSeries(state.cashflow.initial, state.cashflow.payment, state.cashflow.periods, state.cashflow.growth);
  const cashDiscount = state.cashflow.discountRate / 100;
  const presentValues = flows.map((flow, index) => flow / Math.pow(1 + cashDiscount, index));
  const cashNpv = presentValues.reduce((sum, value) => sum + value, 0);
  const cashIrr = internalRateOfReturn(flows);
  const sensitivityRates = Array.from({ length: 9 }, (_, index) => index * 0.05);

  return {
    simple: {
      summary: [
        { label: "Interes generado", value: formatCurrency.format(simple.interest), tone: simple.interest >= 0 ? "positive" : "negative" },
        { label: "Monto final", value: formatCurrency.format(simple.amount) },
        { label: "Tasa decimal", value: formatNumber.format(simple.decimalRate) }
      ] satisfies ResultItem[],
      steps: [
        "Formula: I = P x i x n.",
        `I = ${formatCurrency.format(state.simple.principal)} x ${formatNumber.format(state.simple.rate / 100)} x ${state.simple.periods}.`,
        `Monto final: F = P + I = ${formatCurrency.format(simple.amount)}.`
      ],
      series: simple.series,
      rows: simple.series.map((amount, period) => ({ Periodo: period, Monto: formatCurrency.format(amount) })),
      exportRows: simple.series.map((amount, period) => ({ Periodo: period, Monto: amount }))
    },
    compound: {
      summary: [
        { label: "Interes compuesto", value: formatCurrency.format(compound.interest), tone: compound.interest >= 0 ? "positive" : "negative" },
        { label: "Monto final", value: formatCurrency.format(compound.amount) },
        { label: "Factor financiero", value: formatNumber.format(compound.factor) }
      ] satisfies ResultItem[],
      steps: [
        "Formula: F = P x (1 + i)^n.",
        `F = ${formatCurrency.format(state.compound.principal)} x (1 + ${formatNumber.format(state.compound.rate / 100)})^${state.compound.periods}.`,
        `Interes: F - P = ${formatCurrency.format(compound.interest)}.`
      ],
      series: compound.series,
      rows: compound.series.map((amount, period) => ({ Periodo: period, Monto: formatCurrency.format(amount) })),
      exportRows: compound.series.map((amount, period) => ({ Periodo: period, Monto: amount }))
    },
    rates: {
      summary: [
        { label: "Tasa efectiva anual", value: asPercent(rates.annualEffective) },
        { label: "Tasa equivalente destino", value: asPercent(rates.targetRate) },
        { label: "Periodos destino por ano", value: String(state.rates.targetFrequency) }
      ] satisfies ResultItem[],
      steps: [
        "Primero se anualiza: EA = (1 + i origen)^m - 1.",
        `EA = (1 + ${formatNumber.format(rates.sourceRate)})^${state.rates.sourceFrequency} - 1 = ${asPercent(rates.annualEffective)}.`,
        `Tasa destino: i = (1 + EA)^(1/${state.rates.targetFrequency}) - 1.`
      ],
      rows: [
        { Concepto: "Tasa origen", Valor: asPercent(rates.sourceRate) },
        { Concepto: "Tasa efectiva anual", Valor: asPercent(rates.annualEffective) },
        { Concepto: "Tasa destino", Valor: asPercent(rates.targetRate) }
      ],
      exportRows: [
        { Concepto: "Tasa origen", Valor: rates.sourceRate },
        { Concepto: "Tasa efectiva anual", Valor: rates.annualEffective },
        { Concepto: "Tasa destino", Valor: rates.targetRate }
      ]
    },
    annuity: {
      payment: annuity.payment,
      summary: [
        { label: "Deposito periodico", value: formatCurrency.format(annuity.payment), tone: "positive" },
        { label: "Total depositado", value: formatCurrency.format(annuity.totalDeposits) },
        { label: "Intereses ganados", value: formatCurrency.format(annuity.totalInterest), tone: "positive" },
        { label: "Saldo final", value: formatCurrency.format(annuity.rows.at(-1)?.balance ?? 0) }
      ] satisfies ResultItem[],
      steps: [
        state.annuity.timing === "end"
          ? "Anualidad vencida: A = VF x i / ((1 + i)^n - 1)."
          : "Anualidad anticipada: A = VF x i / [((1 + i)^n - 1) x (1 + i)].",
        `A = ${formatCurrency.format(state.annuity.futureValue)} con i = ${formatNumber.format(state.annuity.rate / 100)} y n = ${state.annuity.periods}.`,
        `Resultado: A = ${formatCurrency.format(annuity.payment)} por periodo.`,
        `Excel: =PAGO(${String(state.annuity.rate).replace(".", ",")}%;${state.annuity.periods};0;-${state.annuity.futureValue};${state.annuity.timing === "beginning" ? 1 : 0})`
      ],
      rows: annuity.rows.map((row) => ({
        Periodo: row.period,
        Deposito: formatCurrency.format(row.payment),
        Interes: formatCurrency.format(row.interest),
        SaldoAcumulado: formatCurrency.format(row.balance)
      })),
      exportRows: annuity.rows.map((row) => ({
        Periodo: row.period,
        Deposito: row.payment,
        Interes: row.interest,
        SaldoAcumulado: row.balance
      }))
    },
    amortization: {
      rawRows: amort.rows,
      summary: [
        { label: "Primera cuota", value: formatCurrency.format(amort.rows[0]?.payment ?? 0) },
        { label: "Ultima cuota", value: formatCurrency.format(amort.rows.at(-1)?.payment ?? 0) },
        { label: "Total intereses", value: formatCurrency.format(amort.totalInterest), tone: "negative" },
        { label: "Total pagado", value: formatCurrency.format(amort.totalPaid) }
      ] satisfies ResultItem[],
      rows: amort.rows.map((row) => ({
        Periodo: row.period,
        Cuota: formatCurrency.format(row.payment),
        Interes: formatCurrency.format(row.interest),
        Abono: formatCurrency.format(row.capital),
        Saldo: formatCurrency.format(row.balance)
      })),
      exportRows: amort.rows.map((row) => ({
        Periodo: row.period,
        Cuota: row.payment,
        Interes: row.interest,
        Abono: row.capital,
        Saldo: row.balance
      }))
    },
    project: {
      npvA,
      npvB,
      summary: [
        { label: "VPN alternativa A", value: formatCurrency.format(npvA), tone: npvA >= 0 ? "positive" : "negative" },
        { label: "TIR alternativa A", value: Number.isFinite(irrA) ? asPercent(irrA) : "No converge" },
        { label: "VPN alternativa B", value: formatCurrency.format(npvB), tone: npvB >= 0 ? "positive" : "negative" },
        { label: "TIR alternativa B", value: Number.isFinite(irrB) ? asPercent(irrB) : "No converge" },
        { label: "Mejor opcion por VPN", value: npvA >= npvB ? "Alternativa A" : "Alternativa B", tone: "positive" }
      ] satisfies ResultItem[],
      steps: [
        "VPN = sumatoria Ft / (1 + i)^t.",
        `Tasa de oportunidad: ${state.project.discountRate}%.`,
        "La TIR aproxima la tasa que hace VPN = 0.",
        `Decision sugerida: ${npvA >= npvB ? "Alternativa A" : "Alternativa B"}.`
      ],
      sensitivity: {
        labels: sensitivityRates.map((item) => asPercent(item)),
        a: sensitivityRates.map((item) => netPresentValue(flowA, item)),
        b: sensitivityRates.map((item) => netPresentValue(flowB, item))
      },
      rows: [
        { Alternativa: "A", VPN: formatCurrency.format(npvA), TIR: Number.isFinite(irrA) ? asPercent(irrA) : "No converge" },
        { Alternativa: "B", VPN: formatCurrency.format(npvB), TIR: Number.isFinite(irrB) ? asPercent(irrB) : "No converge" }
      ],
      exportRows: [
        { Alternativa: "A", VPN: npvA, TIR: Number.isFinite(irrA) ? irrA : "" },
        { Alternativa: "B", VPN: npvB, TIR: Number.isFinite(irrB) ? irrB : "" }
      ]
    },
    cashflow: {
      flows,
      summary: [
        { label: "VPN", value: formatCurrency.format(cashNpv), tone: cashNpv >= 0 ? "positive" : "negative" },
        { label: "TIR aproximada", value: Number.isFinite(cashIrr) ? asPercent(cashIrr) : "No converge" },
        { label: "Periodos evaluados", value: String(flows.length - 1) }
      ] satisfies ResultItem[],
      rows: flows.map((flow, index) => ({
        Periodo: index,
        Flujo: formatCurrency.format(flow),
        ValorPresente: formatCurrency.format(presentValues[index])
      })),
      exportRows: flows.map((flow, index) => ({
        Periodo: index,
        Flujo: flow,
        ValorPresente: presentValues[index]
      }))
    }
  } satisfies Record<Exclude<ModuleId, "dashboard" | "assistant">, CalculatedModule & Record<string, unknown>>;
}

function rowsToCsv(rows: TableRow[]) {
  const headers = Object.keys(rows[0] ?? {});
  return [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
}

function csvCell(value: string | number) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) return `"${text.replaceAll("\"", "\"\"")}"`;
  return text;
}

function loadDraft(): FormState {
  try {
    const draft = localStorage.getItem(DRAFT_KEY);
    return draft ? { ...defaultState, ...JSON.parse(draft) } : defaultState;
  } catch {
    return defaultState;
  }
}

function loadScenarios(): SavedScenario[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as SavedScenario[];
  } catch {
    return [];
  }
}

type TourStep = {
  module: ModuleId;
  selector: string;
  title: string;
  text: string;
};

const tourSteps: TourStep[] = [
  { module: "dashboard", selector: "[data-tour='brand']", title: "Bienvenido a FinCalcPro", text: "Esta es la marca del simulador y la entrada a la experiencia de ingenieria economica." },
  { module: "dashboard", selector: "[data-tour='module-nav']", title: "Menu de modulos", text: "Desde aqui eliges el calculo financiero que quieres resolver." },
  { module: "dashboard", selector: "[data-tour='top-actions']", title: "Acciones rapidas", text: "Guarda escenarios, exporta CSV, reinicia datos o vuelve a abrir este tutorial." },
  { module: "assistant", selector: "[data-tour='assistant-chat']", title: "Asistente IA", text: "Aqui puedes escribir un problema financiero, ver un plan de autollenado y abrir el modulo correcto con explicacion campo por campo." },
  { module: "simple", selector: "[data-tour='input-form']", title: "Entradas editables", text: "Cada modulo recalcula automaticamente cuando modificas un dato." },
  { module: "simple", selector: "[data-tour='result-steps']", title: "Resultado y procedimiento", text: "FinCalcPro muestra resultados e interpreta la formula paso a paso." },
  { module: "compound", selector: "[data-tour='growth-chart']", title: "Graficas financieras", text: "Las graficas permiten ver la evolucion del dinero en el tiempo." },
  { module: "annuity", selector: "[data-tour='annuity-form']", title: "Anualidades y Pago", text: "Este modulo calcula el deposito periodico requerido para alcanzar un valor futuro." },
  { module: "annuity", selector: "[data-tour='annuity-result']", title: "Pago requerido", text: "Aqui ves la cuota, la formula y la equivalencia con la funcion PAGO." },
  { module: "amortization", selector: "[data-tour='amortization-form']", title: "Sistemas de amortizacion", text: "Compara sistemas frances, aleman y americano." },
  { module: "amortization", selector: "[data-tour='amortization-table']", title: "Tabla financiera", text: "La tabla detalla cuota, interes, abono a capital y saldo por periodo." },
  { module: "project", selector: "[data-tour='project-result']", title: "Criterios de decision", text: "VPN y TIR ayudan a comparar alternativas de inversion." },
  { module: "project", selector: "[data-tour='sensitivity-chart']", title: "Sensibilidad", text: "Observa como cambia el VPN ante distintas tasas de oportunidad." },
  { module: "cashflow", selector: "[data-tour='cashflow-diagram']", title: "Flujo de caja visual", text: "Los diagramas SVG separan ingresos y egresos por periodo." }
];

function TourGuide({
  activeModule,
  setActiveModule
}: {
  activeModule: ModuleId;
  setActiveModule: (module: ModuleId) => void;
}) {
  const [open, setOpen] = useState(new URLSearchParams(window.location.search).get("tour") === "1");
  const [index, setIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<DOMRect | null>(null);
  const step = tourSteps[index];

  useEffect(() => {
    if (!open) return;
    if (activeModule !== step.module) {
      setActiveModule(step.module);
      return;
    }

    const timeout = window.setTimeout(() => {
      const target = document.querySelector(step.selector);
      if (!target) return;
      target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      window.setTimeout(() => setSpotlight(target.getBoundingClientRect()), 220);
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [activeModule, index, open, setActiveModule, step.module, step.selector]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const target = document.querySelector(step.selector);
      if (target) setSpotlight(target.getBoundingClientRect());
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [open, step.selector]);

  if (!open) {
    return (
      <button className="soft-button" type="button" onClick={() => setOpen(true)}>
        <Sparkles size={17} /> Tutorial
      </button>
    );
  }

  const cardStyle = spotlight ? positionTourCard(spotlight) : undefined;

  return (
    <>
      <button className="soft-button" type="button" onClick={() => setOpen(true)}>
        <Sparkles size={17} /> Tutorial
      </button>
      <div className="tour-overlay" onClick={() => setOpen(false)} />
      {spotlight && (
        <div
          className="tour-spotlight"
          style={{
            left: Math.max(8, spotlight.left - 8),
            top: Math.max(8, spotlight.top - 8),
            width: Math.min(window.innerWidth - 16, spotlight.width + 16),
            height: Math.min(window.innerHeight - 16, spotlight.height + 16)
          }}
        />
      )}
      <section className="tour-card" style={cardStyle} aria-live="polite" aria-label="Tutorial guiado">
        <div className="tour-progress" style={{ "--tour-progress": `${((index + 1) / tourSteps.length) * 100}%` } as React.CSSProperties} />
        <p>Paso {index + 1} de {tourSteps.length}</p>
        <h2>{step.title}</h2>
        <span>{step.text}</span>
        <div className="tour-actions">
          <button className="tour-button secondary" disabled={index === 0} type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))}>
            &lt; Anterior
          </button>
          <button className="tour-button secondary" type="button" onClick={() => setOpen(false)}>
            Cerrar
          </button>
          <button
            className="tour-button primary"
            type="button"
            onClick={() => {
              if (index === tourSteps.length - 1) setOpen(false);
              else setIndex((value) => value + 1);
            }}
          >
            {index === tourSteps.length - 1 ? "Finalizar" : "Siguiente >"}
          </button>
        </div>
      </section>
    </>
  );
}

function positionTourCard(rect: DOMRect): React.CSSProperties {
  const gap = 14;
  const width = Math.min(410, window.innerWidth - 32);
  let left = rect.right + gap;
  let top = rect.top;

  if (left + width > window.innerWidth - 16) left = rect.left - width - gap;
  if (left < 16) left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16));
  if (top + 240 > window.innerHeight - 16) top = window.innerHeight - 256;
  if (top < 16) top = 16;

  return { left, top, width };
}
