import type { FormState, ModuleId } from "../types";
import { annuityPayment } from "./finance";
import { formatCurrency, formatNumber } from "./format";

export type AssistantSuggestion =
  | (AssistantSuggestionDetails & { module: "annuity"; fields: Partial<FormState["annuity"]> })
  | (AssistantSuggestionDetails & { module: "simple"; fields: Partial<FormState["simple"]> })
  | (AssistantSuggestionDetails & { module: "compound"; fields: Partial<FormState["compound"]> })
  | (AssistantSuggestionDetails & { module: "rates"; fields: Partial<FormState["rates"]> })
  | (AssistantSuggestionDetails & { module: "amortization"; fields: Partial<FormState["amortization"]> })
  | (AssistantSuggestionDetails & { module: "project"; fields: Partial<FormState["project"]> })
  | (AssistantSuggestionDetails & { module: "cashflow"; fields: Partial<FormState["cashflow"]> });

export type AssistantSuggestionDetails = {
  summary: string;
  mappings: AssistantFieldMapping[];
};

export type AssistantFieldMapping = {
  field: string;
  label: string;
  value: string;
  reason: string;
};

export type AssistantResponse = {
  answer: string;
  suggestedModule?: ModuleId;
  suggestion?: AssistantSuggestion;
};

const numberWords: Record<string, number> = {
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10
};

export function answerFinancialPrompt(prompt: string): AssistantResponse {
  const normalized = normalizeText(prompt);
  const rate = extractRate(prompt);
  const periods = extractPeriods(normalized);
  const amounts = extractAmounts(prompt);
  const largestAmount = amounts.sort((a, b) => b - a)[0];

  if (looksLikeAnnuity(normalized)) {
    if (largestAmount && rate !== undefined && periods) {
      const timing = normalized.includes("inicio") || normalized.includes("anticipad") ? "beginning" : "end";
      const result = annuityPayment(largestAmount, rate, periods, timing);
      const timingLabel = timing === "end" ? "final de cada periodo" : "inicio de cada periodo";
      const suggestion = buildAnnuitySuggestion(largestAmount, rate, periods, timing);

      return {
        suggestedModule: "annuity",
        suggestion,
        answer: [
          "Este problema es de anualidad de ahorro para valor futuro.",
          "",
          "Donde colocar los datos:",
          `- Modulo: Anualidades.`,
          `- Valor futuro objetivo: ${formatCurrency.format(largestAmount)}.`,
          `- Tasa por periodo: ${formatNumber.format(rate)}%.`,
          `- Numero de periodos: ${periods}.`,
          `- Momento del deposito: ${timingLabel}.`,
          "",
          "Procedimiento:",
          timing === "end"
            ? "A = VF x i / ((1 + i)^n - 1)."
            : "A = VF x i / [((1 + i)^n - 1) x (1 + i)].",
          `A = ${formatCurrency.format(largestAmount)} con i = ${formatNumber.format(rate / 100)} y n = ${periods}.`,
          "",
          `Resultado aproximado: debes depositar ${formatCurrency.format(result.payment)} por periodo.`,
          `Total depositado: ${formatCurrency.format(result.totalDeposits)}.`,
          `Intereses ganados: ${formatCurrency.format(result.totalInterest)}.`
        ].join("\n")
      };
    }

    return {
      suggestedModule: "annuity",
      answer: [
        "Parece un problema de anualidades, pero me faltan datos para calcularlo completo.",
        "",
        "Necesito:",
        "- Valor futuro que quieres reunir.",
        "- Tasa por periodo.",
        "- Numero de periodos.",
        "- Si los depositos son al inicio o al final de cada periodo."
      ].join("\n")
    };
  }

  if (normalized.includes("interes simple")) {
    const suggestion = largestAmount && rate !== undefined && periods
      ? buildSimpleSuggestion(largestAmount, rate, periods)
      : undefined;

    return {
      suggestedModule: "simple",
      suggestion,
      answer: [
        "Ese caso corresponde al modulo Interes simple.",
        "",
        "Coloca:",
        "- Capital inicial en el campo Capital inicial.",
        "- Tasa por periodo en porcentaje.",
        "- Numero de periodos.",
        "",
        "Formula: I = P x i x n. El monto final se obtiene con F = P + I."
      ].join("\n")
    };
  }

  if (normalized.includes("interes compuesto") || normalized.includes("capitalizacion")) {
    const suggestion = largestAmount && rate !== undefined && periods
      ? buildCompoundSuggestion(largestAmount, rate, periods)
      : undefined;

    return {
      suggestedModule: "compound",
      suggestion,
      answer: [
        "Ese caso corresponde al modulo Interes compuesto.",
        "",
        "Coloca capital inicial, tasa por periodo y numero de periodos.",
        "Formula: F = P x (1 + i)^n. El interes ganado es F - P."
      ].join("\n")
    };
  }

  if (normalized.includes("amortizacion") || normalized.includes("prestamo") || normalized.includes("credito")) {
    const suggestion = largestAmount && rate !== undefined && periods
      ? buildAmortizationSuggestion(largestAmount, rate, periods)
      : undefined;

    return {
      suggestedModule: "amortization",
      suggestion,
      answer: [
        "Ese caso corresponde al modulo Amortizacion.",
        "",
        "Coloca:",
        "- Sistema: frances, aleman o americano.",
        "- Monto del prestamo.",
        "- Tasa por periodo.",
        "- Numero de cuotas.",
        "",
        "La tabla te mostrara cuota, interes, abono a capital y saldo."
      ].join("\n")
    };
  }

  if (normalized.includes("vpn") || normalized.includes("tir") || normalized.includes("alternativa")) {
    return {
      suggestedModule: "project",
      answer: [
        "Ese caso corresponde al modulo VPN y TIR.",
        "",
        "Coloca la tasa de oportunidad y los flujos de cada alternativa separados por comas.",
        "Ejemplo: -10000000, 3200000, 3400000, 3600000.",
        "",
        "El criterio principal es comparar el VPN; la TIR ayuda como indicador complementario."
      ].join("\n")
    };
  }

  if (normalized.includes("tasa") && (normalized.includes("convert") || normalized.includes("equivalent"))) {
    return {
      suggestedModule: "rates",
      answer: [
        "Ese caso corresponde al modulo Conversion de tasas.",
        "",
        "Coloca la tasa efectiva origen, la frecuencia origen por ano y la frecuencia destino por ano.",
        "FinCalcPro primero calcula la tasa efectiva anual y luego despeja la tasa equivalente destino."
      ].join("\n")
    };
  }

  return {
    answer: [
      "Puedo ayudarte a identificar el modulo y organizar los datos.",
      "",
      "Prueba escribiendo el enunciado completo, por ejemplo:",
      "- Cuanto debo depositar cada mes para reunir 8.500.000 al 2,5% mensual durante 24 meses.",
      "- Calcular VPN y TIR para estos flujos...",
      "- Hacer una tabla de amortizacion para un prestamo..."
    ].join("\n")
  };
}

function buildAnnuitySuggestion(
  futureValue: number,
  rate: number,
  periods: number,
  timing: FormState["annuity"]["timing"]
): AssistantSuggestion {
  return {
    module: "annuity",
    fields: { futureValue, rate, periods, timing },
    summary: "El agente puede llenar Anualidades y calcular automaticamente el deposito periodico requerido.",
    mappings: [
      {
        field: "futureValue",
        label: "Valor futuro objetivo",
        value: formatCurrency.format(futureValue),
        reason: "El enunciado indica la suma que se quiere reunir al final del plazo."
      },
      {
        field: "rate",
        label: "Tasa por periodo (%)",
        value: `${formatNumber.format(rate)}%`,
        reason: "La tasa se entrega como mensual, por eso se usa como tasa de cada periodo de deposito."
      },
      {
        field: "periods",
        label: "Numero de periodos",
        value: String(periods),
        reason: "El plazo se expresa en meses o se convierte a meses para coincidir con depositos mensuales."
      },
      {
        field: "timing",
        label: "Momento del deposito",
        value: timing === "end" ? "Final de cada periodo" : "Inicio de cada periodo",
        reason: timing === "end"
          ? "El enunciado dice que los depositos son al final de cada mes, asi que es una anualidad vencida."
          : "El enunciado menciona depositos al inicio, asi que se usa anualidad anticipada."
      }
    ]
  };
}

function buildSimpleSuggestion(principal: number, rate: number, periods: number): AssistantSuggestion {
  return {
    module: "simple",
    fields: { principal, rate, periods },
    summary: "El agente puede llenar Interes simple y calcular interes, monto final y procedimiento.",
    mappings: [
      {
        field: "principal",
        label: "Capital inicial",
        value: formatCurrency.format(principal),
        reason: "Es el valor base sobre el que se calcula el interes."
      },
      {
        field: "rate",
        label: "Tasa por periodo (%)",
        value: `${formatNumber.format(rate)}%`,
        reason: "En interes simple la tasa se multiplica directamente por el numero de periodos."
      },
      {
        field: "periods",
        label: "Numero de periodos",
        value: String(periods),
        reason: "El plazo define cuantas veces se aplica la tasa simple."
      }
    ]
  };
}

function buildCompoundSuggestion(principal: number, rate: number, periods: number): AssistantSuggestion {
  return {
    module: "compound",
    fields: { principal, rate, periods },
    summary: "El agente puede llenar Interes compuesto y recalcular el crecimiento periodo a periodo.",
    mappings: [
      {
        field: "principal",
        label: "Capital inicial",
        value: formatCurrency.format(principal),
        reason: "Es el monto que se capitaliza durante el plazo."
      },
      {
        field: "rate",
        label: "Tasa por periodo (%)",
        value: `${formatNumber.format(rate)}%`,
        reason: "La tasa se aplica sobre el saldo acumulado en cada periodo."
      },
      {
        field: "periods",
        label: "Numero de periodos",
        value: String(periods),
        reason: "Determina el exponente de la formula F = P x (1 + i)^n."
      }
    ]
  };
}

function buildAmortizationSuggestion(loan: number, rate: number, periods: number): AssistantSuggestion {
  return {
    module: "amortization",
    fields: { method: "french", loan, rate, periods },
    summary: "El agente puede llenar Amortizacion con sistema frances por defecto y generar la tabla de pagos.",
    mappings: [
      {
        field: "method",
        label: "Sistema",
        value: "Frances",
        reason: "Si el enunciado no especifica sistema, se usa frances porque mantiene una cuota fija."
      },
      {
        field: "loan",
        label: "Monto del prestamo",
        value: formatCurrency.format(loan),
        reason: "Es el capital que se debe amortizar."
      },
      {
        field: "rate",
        label: "Tasa por periodo (%)",
        value: `${formatNumber.format(rate)}%`,
        reason: "La tasa calcula los intereses de cada cuota."
      },
      {
        field: "periods",
        label: "Numero de cuotas",
        value: String(periods),
        reason: "Indica cuantos pagos debe construir la tabla de amortizacion."
      }
    ]
  };
}

function looksLikeAnnuity(text: string) {
  return (
    text.includes("deposit") ||
    text.includes("ahorro") ||
    text.includes("reunir") ||
    text.includes("valor futuro") ||
    text.includes("pago") ||
    text.includes("mensualidad")
  );
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extractRate(value: string) {
  const match = value.match(/(\d+(?:[.,]\d+)?)\s*%/);
  return match ? parseLocaleNumber(match[1]) : undefined;
}

function extractPeriods(normalized: string) {
  const numericMonths = normalized.match(/(\d+)\s*(mes|meses|periodos|cuotas)/);
  if (numericMonths) return Number(numericMonths[1]);

  const numericYears = normalized.match(/(\d+)\s*(ano|anos|años)/);
  if (numericYears) return Number(numericYears[1]) * (normalized.includes("mes") ? 12 : 1);

  for (const [word, value] of Object.entries(numberWords)) {
    if (normalized.includes(`${word} anos`) || normalized.includes(`${word} ano`)) {
      return value * (normalized.includes("mes") ? 12 : 1);
    }
    if (normalized.includes(`${word} meses`) || normalized.includes(`${word} mes`)) {
      return value;
    }
  }

  return undefined;
}

function extractAmounts(value: string) {
  const matches = value.match(/-?\d{1,3}(?:[.\s]\d{3})+(?:,\d+)?|-?\d+(?:,\d+)?/g) ?? [];
  return matches
    .map(parseLocaleNumber)
    .filter((number) => Number.isFinite(number) && Math.abs(number) >= 100);
}

function parseLocaleNumber(value: string) {
  const clean = value.trim().replace(/\s/g, "");
  if (clean.includes(",") && clean.includes(".")) {
    return Number(clean.replace(/\./g, "").replace(",", "."));
  }
  if (clean.includes(",")) {
    return Number(clean.replace(",", "."));
  }
  return Number(clean.replace(/\./g, ""));
}
