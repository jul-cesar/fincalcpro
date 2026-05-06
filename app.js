const STORAGE_KEY = "fincalcpro-scenarios-v2";

const formatCurrency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
});

const formatNumber = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 4
});

const titles = {
  dashboard: "Panel de trabajo",
  simple: "Interes simple",
  compound: "Interes compuesto",
  rates: "Conversion de tasas",
  annuity: "Anualidades y Pago",
  amortization: "Amortizacion",
  project: "VPN, TIR y alternativas",
  cashflow: "Flujo de caja"
};

const tutorialSteps = [
  {
    module: "dashboard",
    selector: ".brand",
    title: "Bienvenido a FinCalcPro",
    text: "Esta es la marca del simulador. Desde aqui la experiencia se organiza como una herramienta academica para ingenieria economica."
  },
  {
    module: "dashboard",
    selector: ".module-nav",
    title: "Menu de modulos",
    text: "Usa esta barra para moverte entre calculos: interes, tasas, amortizacion, VPN/TIR y flujo de caja."
  },
  {
    module: "dashboard",
    selector: ".top-actions",
    title: "Acciones rapidas",
    text: "Aqui puedes iniciar este tutorial, guardar escenarios, exportar resultados a CSV o restablecer los datos."
  },
  {
    module: "simple",
    selector: "#simple .calculator-form",
    title: "Entradas del calculo",
    text: "Cada modulo tiene campos editables. Al cambiar un dato, FinCalcPro recalcula automaticamente los resultados."
  },
  {
    module: "simple",
    selector: "#simple .result-layout",
    title: "Resultado y procedimiento",
    text: "La app no solo entrega el resultado: tambien muestra el procedimiento para apoyar la explicacion academica."
  },
  {
    module: "compound",
    selector: "#compound-chart",
    title: "Graficas financieras",
    text: "Las graficas muestran como evoluciona el dinero en el tiempo. Aqui puedes ver el crecimiento compuesto periodo a periodo."
  },
  {
    module: "annuity",
    selector: "#annuity .calculator-form",
    title: "Anualidades y funcion Pago",
    text: "Este modulo calcula el deposito periodico necesario para alcanzar un valor futuro, como en ejercicios de ahorro mensual."
  },
  {
    module: "annuity",
    selector: "#annuity .result-layout",
    title: "Cuota periodica requerida",
    text: "Aqui veras el pago mensual, la formula usada y la equivalencia con la funcion PAGO de Excel."
  },
  {
    module: "amortization",
    selector: "#amortization .calculator-form",
    title: "Sistemas de amortizacion",
    text: "En este modulo puedes elegir entre sistema frances, aleman y americano para comparar cuotas, intereses y saldos."
  },
  {
    module: "amortization",
    selector: "#amortization .table-wrap",
    title: "Tabla financiera",
    text: "La tabla detalla periodo, cuota, interes, abono a capital y saldo pendiente. Es ideal para revisar creditos paso a paso."
  },
  {
    module: "project",
    selector: "#project .result-layout",
    title: "Criterios de decision",
    text: "El modulo VPN/TIR compara alternativas y sugiere la mejor opcion segun el valor presente neto."
  },
  {
    module: "project",
    selector: "#sensitivity-chart",
    title: "Analisis de sensibilidad",
    text: "Esta grafica permite observar como cambia el VPN cuando varia la tasa de oportunidad."
  },
  {
    module: "cashflow",
    selector: "#cashflow-canvas",
    title: "Flujo de caja visual",
    text: "El diagrama distingue ingresos y egresos por periodo para que el comportamiento del proyecto sea facil de interpretar."
  },
  {
    module: "cashflow",
    selector: "#export-button",
    title: "Exportacion",
    text: "Cuando estes en un modulo de calculo, este boton descarga los datos en CSV para abrirlos en Excel u otra herramienta."
  }
];

const defaultValues = {};
let activeModule = "dashboard";
let latestData = {};
let tutorialIndex = 0;
let tutorialActive = false;

document.querySelectorAll("form").forEach((form) => {
  defaultValues[form.dataset.calculator] = new FormData(form);
});

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => showModule(button.dataset.module));
});

document.querySelectorAll(".calculator-form").forEach((form) => {
  form.addEventListener("input", () => {
    calculateAll();
    saveDraft();
  });
});

document.getElementById("reset-button").addEventListener("click", () => {
  document.querySelectorAll("form").forEach((form) => {
    const values = defaultValues[form.dataset.calculator];
    for (const [name, value] of values.entries()) {
      form.elements[name].value = value;
    }
  });
  calculateAll();
  saveDraft();
  showToast("Datos restablecidos.");
});

document.getElementById("save-scenario-button").addEventListener("click", saveScenario);
document.getElementById("export-button").addEventListener("click", exportCurrentModule);
document.getElementById("clear-scenarios-button").addEventListener("click", clearScenarios);
document.getElementById("tutorial-button").addEventListener("click", startTutorial);
document.getElementById("tour-prev").addEventListener("click", previousTutorialStep);
document.getElementById("tour-next").addEventListener("click", nextTutorialStep);
document.getElementById("tour-close").addEventListener("click", closeTutorial);
document.getElementById("tour-overlay").addEventListener("click", closeTutorial);
window.addEventListener("resize", drawVisibleCharts);
window.addEventListener("scroll", () => {
  if (tutorialActive) positionTutorialCard();
}, { passive: true });
window.addEventListener("hashchange", () => {
  const moduleId = location.hash.replace("#", "");
  if (titles[moduleId]) showModule(moduleId, false);
});

loadDraft();
calculateAll();
renderSavedScenarios();
showModule(titles[location.hash.replace("#", "")] ? location.hash.replace("#", "") : "dashboard", false);
if (new URLSearchParams(location.search).get("tour") === "1") {
  window.setTimeout(startTutorial, 250);
}

function showModule(moduleId, updateHash = true) {
  activeModule = moduleId;

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.module === moduleId);
  });

  document.querySelectorAll(".module-page").forEach((page) => {
    page.classList.toggle("active", page.id === moduleId);
  });

  document.getElementById("module-title").textContent = titles[moduleId];
  if (updateHash && location.hash.replace("#", "") !== moduleId) {
    history.replaceState(null, "", `#${moduleId}`);
  }
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }), 0);
  drawVisibleCharts();
  if (tutorialActive) {
    window.setTimeout(positionTutorialCard, 80);
  }
}

function calculateAll() {
  latestData.simple = calculateSimpleInterest();
  latestData.compound = calculateCompoundInterest();
  latestData.rates = calculateRateConversion();
  latestData.annuity = calculateAnnuityPayment();
  latestData.amortization = calculateAmortization();
  latestData.project = calculateProject();
  latestData.cashflow = calculateCashflow();
}

function getFormValues(name) {
  const form = document.querySelector(`[data-calculator="${name}"]`);
  return Object.fromEntries(new FormData(form).entries());
}

function setValidation(name, errors) {
  const target = document.getElementById(`${name}-validation`);
  if (!target) return;
  target.textContent = errors.length ? errors[0] : "";
}

function validatePositive(value, label, allowZero = false) {
  const number = Number(value);
  if (!Number.isFinite(number)) return `${label} debe ser un numero valido.`;
  if (allowZero ? number < 0 : number <= 0) return `${label} debe ser mayor ${allowZero ? "o igual a" : "que"} cero.`;
  return "";
}

function percent(value) {
  return Number(value) / 100;
}

function renderResult(targetId, title, items) {
  document.getElementById(targetId).innerHTML = `
    <h3 class="result-title">${title}</h3>
    <ul class="result-list">
      ${items.map((item) => `
        <li>
          <span>${item.label}</span>
          <strong class="${item.className || ""}">${item.value}</strong>
        </li>
      `).join("")}
    </ul>
  `;
}

function renderSteps(targetId, title, steps) {
  document.getElementById(targetId).innerHTML = `
    <h3 class="steps-title">${title}</h3>
    <ol class="steps-list">
      ${steps.map((step) => `<li>${step}</li>`).join("")}
    </ol>
  `;
}

function calculateSimpleInterest() {
  const { principal, rate, periods } = getFormValues("simple");
  const errors = [
    validatePositive(principal, "El capital", true),
    validatePositive(periods, "El numero de periodos", true)
  ].filter(Boolean);
  setValidation("simple", errors);

  const p = Math.max(0, Number(principal));
  const i = percent(rate);
  const n = Math.max(0, Number(periods));
  const series = Array.from({ length: Math.min(n, 60) + 1 }, (_, period) => p + p * i * period);
  const interest = p * i * n;
  const amount = p + interest;

  renderResult("simple-result", "Resultado", [
    { label: "Interes generado", value: formatCurrency.format(interest), className: interest >= 0 ? "positive" : "negative" },
    { label: "Monto final", value: formatCurrency.format(amount) },
    { label: "Tasa decimal", value: formatNumber.format(i) }
  ]);

  renderSteps("simple-steps", "Procedimiento", [
    "Formula: I = P x i x n.",
    `I = ${formatCurrency.format(p)} x ${formatNumber.format(i)} x ${n}.`,
    `Monto final: F = P + I = ${formatCurrency.format(amount)}.`
  ]);

  drawLineChart("simple-chart", series, "Evolucion del monto", "#0f766e");
  return { rows: series.map((value, period) => ({ Periodo: period, Monto: value })), result: { interest, amount } };
}

function calculateCompoundInterest() {
  const { principal, rate, periods } = getFormValues("compound");
  const errors = [
    validatePositive(principal, "El capital", true),
    validatePositive(periods, "El numero de periodos", true)
  ].filter(Boolean);
  setValidation("compound", errors);

  const p = Math.max(0, Number(principal));
  const i = percent(rate);
  const n = Math.max(0, Number(periods));
  const factor = Math.pow(1 + i, n);
  const amount = p * factor;
  const interest = amount - p;
  const series = Array.from({ length: Math.min(n, 60) + 1 }, (_, period) => p * Math.pow(1 + i, period));

  renderResult("compound-result", "Resultado", [
    { label: "Interes compuesto", value: formatCurrency.format(interest), className: interest >= 0 ? "positive" : "negative" },
    { label: "Monto final", value: formatCurrency.format(amount) },
    { label: "Factor financiero", value: formatNumber.format(factor) }
  ]);

  renderSteps("compound-steps", "Procedimiento", [
    "Formula: F = P x (1 + i)^n.",
    `F = ${formatCurrency.format(p)} x (1 + ${formatNumber.format(i)})^${n}.`,
    `Interes: F - P = ${formatCurrency.format(interest)}.`
  ]);

  drawLineChart("compound-chart", series, "Crecimiento compuesto", "#2563eb");
  return { rows: series.map((value, period) => ({ Periodo: period, Monto: value })), result: { interest, amount } };
}

function calculateRateConversion() {
  const { rate, sourceFrequency, targetFrequency } = getFormValues("rates");
  const errors = validatePositive(Number(rate) + 100, "La tasa origen ajustada");
  setValidation("rates", errors ? [errors] : []);

  const sourceRate = percent(rate);
  const source = Number(sourceFrequency);
  const target = Number(targetFrequency);
  const annualEffective = Math.pow(1 + sourceRate, source) - 1;
  const targetRate = Math.pow(1 + annualEffective, 1 / target) - 1;

  renderResult("rates-result", "Resultado", [
    { label: "Tasa efectiva anual", value: `${formatNumber.format(annualEffective * 100)}%` },
    { label: "Tasa equivalente destino", value: `${formatNumber.format(targetRate * 100)}%` },
    { label: "Periodos destino por ano", value: target }
  ]);

  renderSteps("rates-steps", "Procedimiento", [
    "Primero se anualiza: EA = (1 + i origen)^m - 1.",
    `EA = (1 + ${formatNumber.format(sourceRate)})^${source} - 1 = ${formatNumber.format(annualEffective * 100)}%.`,
    `Tasa destino: i = (1 + EA)^(1/${target}) - 1.`
  ]);

  return {
    rows: [
      { Concepto: "Tasa origen", Valor: sourceRate },
      { Concepto: "Tasa efectiva anual", Valor: annualEffective },
      { Concepto: "Tasa destino", Valor: targetRate }
    ],
    result: { annualEffective, targetRate }
  };
}

function calculateAnnuityPayment() {
  const { futureValue, rate, periods, timing } = getFormValues("annuity");
  const errors = [
    validatePositive(futureValue, "El valor futuro"),
    validatePositive(periods, "El numero de periodos")
  ].filter(Boolean);
  setValidation("annuity", errors);

  const fv = Math.max(0, Number(futureValue));
  const i = percent(rate);
  const n = Math.max(1, Number(periods));
  const timingFactor = timing === "beginning" ? 1 + i : 1;
  const annuityFactor = i === 0 ? n * timingFactor : ((Math.pow(1 + i, n) - 1) / i) * timingFactor;
  const payment = annuityFactor === 0 ? 0 : fv / annuityFactor;
  const rows = buildAnnuityRows(payment, i, n, timing);
  const totalDeposits = payment * n;
  const totalInterest = rows[rows.length - 1].balance - totalDeposits;
  const excelType = timing === "beginning" ? 1 : 0;

  renderResult("annuity-result", "Deposito requerido", [
    { label: "Deposito periodico", value: formatCurrency.format(payment), className: "positive" },
    { label: "Total depositado", value: formatCurrency.format(totalDeposits) },
    { label: "Intereses ganados", value: formatCurrency.format(totalInterest), className: "positive" },
    { label: "Saldo final", value: formatCurrency.format(rows[rows.length - 1].balance) }
  ]);

  renderSteps("annuity-steps", "Formula y funcion Pago", [
    timing === "end"
      ? "Anualidad vencida: A = VF x i / ((1 + i)^n - 1)."
      : "Anualidad anticipada: A = VF x i / [((1 + i)^n - 1) x (1 + i)].",
    `A = ${formatCurrency.format(fv)} x ${formatNumber.format(i)} / ${formatNumber.format(annuityFactor * i || n)}.`,
    `Resultado: A = ${formatCurrency.format(payment)} por periodo.`,
    `En Excel: =PAGO(${String(rate).replace(".", ",")}% ; ${n} ; 0 ; -${formatNumber.format(fv)} ; ${excelType})`
  ]);

  document.getElementById("annuity-table").innerHTML = rows.map((row) => `
    <tr>
      <td>${row.period}</td>
      <td>${formatCurrency.format(row.payment)}</td>
      <td>${formatCurrency.format(row.interest)}</td>
      <td>${formatCurrency.format(row.balance)}</td>
    </tr>
  `).join("");

  drawAnnuityDiagram(payment, fv, n, timing);
  return { rows: rows.map((row) => ({
    Periodo: row.period,
    Deposito: row.payment,
    Interes: row.interest,
    SaldoAcumulado: row.balance
  })), result: { payment, totalDeposits, totalInterest, futureValue: fv } };
}

function buildAnnuityRows(payment, rate, periods, timing) {
  let balance = 0;
  const rows = [];

  for (let period = 1; period <= periods; period += 1) {
    let interest = 0;

    if (timing === "beginning") {
      balance += payment;
      interest = balance * rate;
      balance += interest;
    } else {
      interest = balance * rate;
      balance += interest + payment;
    }

    rows.push({ period, payment, interest, balance });
  }

  return rows;
}

function calculateAmortization() {
  const { method, loan, rate, periods } = getFormValues("amortization");
  const errors = [
    validatePositive(loan, "El prestamo"),
    validatePositive(periods, "El numero de cuotas")
  ].filter(Boolean);
  setValidation("amortization", errors);

  const principal = Math.max(0, Number(loan));
  const i = percent(rate);
  const n = Math.max(1, Number(periods));
  const rows = buildAmortizationRows(method, principal, i, n);
  const totalInterest = rows.reduce((sum, row) => sum + row.interest, 0);
  const firstPayment = rows[0]?.payment || 0;
  const lastPayment = rows[rows.length - 1]?.payment || 0;
  const methodLabel = {
    french: "Frances",
    german: "Aleman",
    american: "Americano"
  }[method];

  renderResult("amortization-result", `Resumen del sistema ${methodLabel}`, [
    { label: method === "french" ? "Cuota fija" : "Primera cuota", value: formatCurrency.format(firstPayment) },
    { label: method === "french" ? "Ultima cuota" : "Ultima cuota", value: formatCurrency.format(lastPayment) },
    { label: "Total intereses", value: formatCurrency.format(totalInterest), className: "negative" },
    { label: "Total pagado", value: formatCurrency.format(principal + totalInterest) }
  ]);

  document.getElementById("amortization-table").innerHTML = rows.map((row) => `
    <tr>
      <td>${row.period}</td>
      <td>${formatCurrency.format(row.payment)}</td>
      <td>${formatCurrency.format(row.interest)}</td>
      <td>${formatCurrency.format(row.capital)}</td>
      <td>${formatCurrency.format(row.balance)}</td>
    </tr>
  `).join("");

  drawBarLineChart("amortization-chart", rows.map((row) => row.interest), rows.map((row) => row.balance), "Interes y saldo", "#b45309", "#2563eb");
  return { rows: rows.map(normalizeAmortizationRow), result: { totalInterest, totalPaid: principal + totalInterest } };
}

function buildAmortizationRows(method, principal, rate, periods) {
  let balance = principal;
  const rows = [];

  for (let period = 1; period <= periods; period += 1) {
    let interest = balance * rate;
    let capital;
    let payment;

    if (method === "german") {
      capital = principal / periods;
      payment = capital + interest;
    } else if (method === "american") {
      capital = period === periods ? principal : 0;
      payment = interest + capital;
    } else {
      payment = rate === 0 ? principal / periods : principal * (rate / (1 - Math.pow(1 + rate, -periods)));
      capital = payment - interest;
    }

    capital = Math.min(capital, balance);
    balance = Math.max(0, balance - capital);
    rows.push({ period, payment, interest, capital, balance });
  }

  return rows;
}

function calculateProject() {
  const { discountRate, flowA, flowB } = getFormValues("project");
  const rate = percent(discountRate);
  const a = parseFlows(flowA);
  const b = parseFlows(flowB);
  const errors = [];

  if (a.length < 2) errors.push("La alternativa A necesita al menos inversion y un flujo.");
  if (b.length < 2) errors.push("La alternativa B necesita al menos inversion y un flujo.");
  setValidation("project", errors);

  const npvA = netPresentValue(a, rate);
  const npvB = netPresentValue(b, rate);
  const irrA = internalRateOfReturn(a);
  const irrB = internalRateOfReturn(b);
  const winner = npvA >= npvB ? "Alternativa A" : "Alternativa B";

  renderResult("project-result", "Comparacion", [
    { label: "VPN alternativa A", value: formatCurrency.format(npvA), className: npvA >= 0 ? "positive" : "negative" },
    { label: "TIR alternativa A", value: Number.isFinite(irrA) ? `${formatNumber.format(irrA * 100)}%` : "No converge" },
    { label: "VPN alternativa B", value: formatCurrency.format(npvB), className: npvB >= 0 ? "positive" : "negative" },
    { label: "TIR alternativa B", value: Number.isFinite(irrB) ? `${formatNumber.format(irrB * 100)}%` : "No converge" },
    { label: "Mejor opcion por VPN", value: winner, className: "positive" }
  ]);

  renderSteps("project-steps", "Criterio de evaluacion", [
    "VPN = sumatoria Ft / (1 + i)^t.",
    `Tasa de oportunidad: ${formatNumber.format(rate * 100)}%.`,
    "La TIR aproxima la tasa que hace VPN = 0.",
    `Decision sugerida: ${winner}.`
  ]);

  drawComparisonChart("project-chart", [
    { label: "A", value: npvA, color: "#0f766e" },
    { label: "B", value: npvB, color: "#2563eb" }
  ], "VPN por alternativa");

  drawSensitivityChart("sensitivity-chart", a, b);
  return {
    rows: [
      { Alternativa: "A", VPN: npvA, TIR: Number.isFinite(irrA) ? irrA : "" },
      { Alternativa: "B", VPN: npvB, TIR: Number.isFinite(irrB) ? irrB : "" }
    ],
    result: { npvA, npvB, irrA, irrB, winner }
  };
}

function calculateCashflow() {
  const values = getFormValues("cashflow");
  const errors = [
    validatePositive(values.periods, "Los periodos")
  ].filter(Boolean);
  setValidation("cashflow", errors);

  const flows = getCashflowData();
  const rate = percent(values.discountRate);
  const presentValues = flows.map((flow, index) => flow / Math.pow(1 + rate, index));
  const npv = presentValues.reduce((total, value) => total + value, 0);
  const irr = internalRateOfReturn(flows);

  renderResult("cashflow-result", "Indicadores del flujo", [
    { label: "VPN", value: formatCurrency.format(npv), className: npv >= 0 ? "positive" : "negative" },
    { label: "TIR aproximada", value: Number.isFinite(irr) ? `${formatNumber.format(irr * 100)}%` : "No converge" },
    { label: "Periodos evaluados", value: flows.length - 1 }
  ]);

  const rows = flows.map((flow, index) => ({ Periodo: index, Flujo: flow, ValorPresente: presentValues[index] }));
  document.getElementById("cashflow-table").innerHTML = rows.map((row) => `
    <tr>
      <td>${row.Periodo}</td>
      <td class="${row.Flujo >= 0 ? "positive" : "negative"}">${formatCurrency.format(row.Flujo)}</td>
      <td>${formatCurrency.format(row.ValorPresente)}</td>
    </tr>
  `).join("");

  drawCashflow();
  return { rows, result: { npv, irr } };
}

function parseFlows(value) {
  return value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((number) => Number.isFinite(number));
}

function netPresentValue(flows, rate) {
  return flows.reduce((total, flow, index) => total + flow / Math.pow(1 + rate, index), 0);
}

function internalRateOfReturn(flows) {
  let low = -0.95;
  let high = 5;
  let npvLow = netPresentValue(flows, low);
  let npvHigh = netPresentValue(flows, high);

  if (!flows.some((flow) => flow < 0) || !flows.some((flow) => flow > 0)) return NaN;
  if (Math.sign(npvLow) === Math.sign(npvHigh)) return NaN;

  for (let iteration = 0; iteration < 120; iteration += 1) {
    const mid = (low + high) / 2;
    const npvMid = netPresentValue(flows, mid);

    if (Math.abs(npvMid) < 0.0001) return mid;

    if (Math.sign(npvMid) === Math.sign(npvLow)) {
      low = mid;
      npvLow = npvMid;
    } else {
      high = mid;
      npvHigh = npvMid;
    }
  }

  return (low + high) / 2;
}

function getCashflowData() {
  const { initial, payment, periods, growth } = getFormValues("cashflow");
  const flows = [Number(initial)];
  const basePayment = Number(payment);
  const growthRate = percent(growth);
  const count = Math.max(1, Math.min(12, Number(periods)));

  for (let period = 1; period <= count; period += 1) {
    flows.push(basePayment * Math.pow(1 + growthRate, period - 1));
  }

  return flows;
}

function drawVisibleCharts() {
  calculateAll();
}

function drawLineChart(canvasId, values, title, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const pad = 52;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  clearCanvas(context, width, height);
  drawChartTitle(context, title);
  drawAxis(context, width, height, pad);

  context.strokeStyle = color;
  context.lineWidth = 4;
  context.beginPath();
  values.forEach((value, index) => {
    const x = pad + (index * (width - pad * 2)) / Math.max(values.length - 1, 1);
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();

  values.forEach((value, index) => {
    const x = pad + (index * (width - pad * 2)) / Math.max(values.length - 1, 1);
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, 4, 0, Math.PI * 2);
    context.fill();
  });

  drawMinMaxLabels(context, min, max, pad, height);
}

function drawBarLineChart(canvasId, bars, line, title, barColor, lineColor) {
  const canvas = document.getElementById(canvasId);
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const pad = 52;
  const max = Math.max(...bars, ...line, 1);
  const barWidth = Math.max(10, (width - pad * 2) / Math.max(bars.length, 1) - 6);

  clearCanvas(context, width, height);
  drawChartTitle(context, title);
  drawAxis(context, width, height, pad);

  bars.forEach((value, index) => {
    const x = pad + index * ((width - pad * 2) / Math.max(bars.length, 1)) + 3;
    const h = (value / max) * (height - pad * 2);
    context.fillStyle = barColor;
    context.fillRect(x, height - pad - h, barWidth, h);
  });

  context.strokeStyle = lineColor;
  context.lineWidth = 4;
  context.beginPath();
  line.forEach((value, index) => {
    const x = pad + (index * (width - pad * 2)) / Math.max(line.length - 1, 1);
    const y = height - pad - (value / max) * (height - pad * 2);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
  drawMinMaxLabels(context, 0, max, pad, height);
}

function drawComparisonChart(canvasId, bars, title) {
  const canvas = document.getElementById(canvasId);
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const pad = 58;
  const maxAbs = Math.max(...bars.map((bar) => Math.abs(bar.value)), 1);
  const axisY = height / 2;

  clearCanvas(context, width, height);
  drawChartTitle(context, title);
  context.strokeStyle = "#94a3b8";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(pad, axisY);
  context.lineTo(width - pad, axisY);
  context.stroke();

  bars.forEach((bar, index) => {
    const slot = (width - pad * 2) / bars.length;
    const x = pad + index * slot + slot * 0.25;
    const barWidth = slot * 0.5;
    const h = (Math.abs(bar.value) / maxAbs) * (height * 0.34);
    const y = bar.value >= 0 ? axisY - h : axisY;
    context.fillStyle = bar.color;
    context.fillRect(x, y, barWidth, h);
    context.fillStyle = "#111827";
    context.font = "700 14px Segoe UI, Arial";
    context.textAlign = "center";
    context.fillText(bar.label, x + barWidth / 2, axisY + 26);
    context.fillText(compactCurrency(bar.value), x + barWidth / 2, bar.value >= 0 ? y - 10 : y + h + 20);
  });
}

function drawSensitivityChart(canvasId, flowA, flowB) {
  const canvas = document.getElementById(canvasId);
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const rates = Array.from({ length: 9 }, (_, index) => index * 0.05);
  const seriesA = rates.map((rate) => netPresentValue(flowA, rate));
  const seriesB = rates.map((rate) => netPresentValue(flowB, rate));
  const all = [...seriesA, ...seriesB];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = 52;

  clearCanvas(context, width, height);
  drawChartTitle(context, "Sensibilidad del VPN por tasa");
  drawAxis(context, width, height, pad);
  drawSeries(context, seriesA, min, max, pad, width, height, "#0f766e");
  drawSeries(context, seriesB, min, max, pad, width, height, "#2563eb");

  context.fillStyle = "#334155";
  context.font = "700 13px Segoe UI, Arial";
  context.fillText("A", width - 72, 34);
  context.fillStyle = "#2563eb";
  context.fillText("B", width - 48, 34);
}

function drawSeries(context, values, min, max, pad, width, height, color) {
  const range = max - min || 1;
  context.strokeStyle = color;
  context.lineWidth = 4;
  context.beginPath();
  values.forEach((value, index) => {
    const x = pad + (index * (width - pad * 2)) / Math.max(values.length - 1, 1);
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
}

function drawCashflow() {
  const canvas = document.getElementById("cashflow-canvas");
  const context = canvas.getContext("2d");
  const flows = getCashflowData();
  const width = canvas.width;
  const height = canvas.height;
  const axisY = height / 2;
  const paddingX = 70;
  const maxMagnitude = Math.max(...flows.map((flow) => Math.abs(flow)), 1);
  const scale = 112 / maxMagnitude;

  clearCanvas(context, width, height);
  drawChartTitle(context, "Diagrama de flujo de caja");

  context.strokeStyle = "#64748b";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(paddingX, axisY);
  context.lineTo(width - paddingX, axisY);
  context.stroke();

  flows.forEach((flow, index) => {
    const x = paddingX + (index * (width - paddingX * 2)) / Math.max(flows.length - 1, 1);
    const arrowLength = Math.max(42, Math.abs(flow) * scale);
    const up = flow >= 0;
    const endY = up ? axisY - arrowLength : axisY + arrowLength;
    const color = up ? "#047857" : "#b42318";

    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(x, axisY);
    context.lineTo(x, endY);
    context.stroke();

    context.beginPath();
    context.moveTo(x, endY);
    context.lineTo(x - 8, endY + (up ? 12 : -12));
    context.lineTo(x + 8, endY + (up ? 12 : -12));
    context.closePath();
    context.fill();

    context.fillStyle = "#111827";
    context.font = "700 14px Segoe UI, Arial";
    context.textAlign = "center";
    context.fillText(String(index), x, axisY + 24);

    context.fillStyle = color;
    context.font = "750 13px Segoe UI, Arial";
    const labelY = up ? Math.max(40, endY - 12) : Math.min(height - 18, endY + 22);
    context.fillText(compactCurrency(flow), x, labelY);
  });
}

function drawAnnuityDiagram(payment, futureValue, periods, timing) {
  const canvas = document.getElementById("annuity-canvas");
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const axisY = height / 2 + 28;
  const paddingX = 70;
  const shownPeriods = Math.min(periods, 12);

  clearCanvas(context, width, height);
  drawChartTitle(context, "Diagrama de ahorro periodico");

  context.strokeStyle = "#64748b";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(paddingX, axisY);
  context.lineTo(width - paddingX, axisY);
  context.stroke();

  for (let index = 0; index <= shownPeriods; index += 1) {
    const x = paddingX + (index * (width - paddingX * 2)) / Math.max(shownPeriods, 1);
    context.fillStyle = "#111827";
    context.font = "700 13px Segoe UI, Arial";
    context.textAlign = "center";
    const label = index === shownPeriods && periods > shownPeriods ? String(periods) : String(index);
    const labelX = index === shownPeriods ? x - 18 : x;
    context.fillText(label, labelX, axisY - 14);
  }

  const depositStart = timing === "beginning" ? 0 : 1;
  const depositEnd = timing === "beginning" ? shownPeriods - 1 : shownPeriods;
  for (let period = depositStart; period <= depositEnd; period += 1) {
    const x = paddingX + (period * (width - paddingX * 2)) / Math.max(shownPeriods, 1);
    const startY = axisY + 84;
    const endY = axisY + 28;

    context.strokeStyle = "#2563eb";
    context.fillStyle = "#2563eb";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(x, startY);
    context.lineTo(x, endY);
    context.stroke();

    context.beginPath();
    context.moveTo(x, endY);
    context.lineTo(x - 8, endY + 12);
    context.lineTo(x + 8, endY + 12);
    context.closePath();
    context.fill();
  }

  const targetX = width - paddingX;
  context.strokeStyle = "#0f766e";
  context.fillStyle = "#0f766e";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(targetX, axisY - 84);
  context.lineTo(targetX, axisY - 8);
  context.stroke();
  context.beginPath();
  context.moveTo(targetX, axisY - 84);
  context.lineTo(targetX - 8, axisY - 70);
  context.lineTo(targetX + 8, axisY - 70);
  context.closePath();
  context.fill();

  context.textAlign = "center";
  context.font = "800 14px Segoe UI, Arial";
  context.fillText(`VF = ${compactCurrency(futureValue)}`, targetX - 8, axisY - 100);

  context.fillStyle = "#2563eb";
  context.fillText(`A = ${compactCurrency(payment)}`, paddingX + 110, axisY + 116);
}

function clearCanvas(context, width, height) {
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
}

function drawChartTitle(context, title) {
  context.fillStyle = "#111827";
  context.font = "800 16px Segoe UI, Arial";
  context.textAlign = "left";
  context.fillText(title, 24, 32);
}

function drawAxis(context, width, height, pad) {
  context.strokeStyle = "#cbd5e1";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(pad, height - pad);
  context.lineTo(width - pad, height - pad);
  context.moveTo(pad, pad);
  context.lineTo(pad, height - pad);
  context.stroke();
}

function drawMinMaxLabels(context, min, max, pad, height) {
  context.fillStyle = "#64748b";
  context.font = "700 12px Segoe UI, Arial";
  context.textAlign = "right";
  context.fillText(compactCurrency(max), pad - 8, pad + 6);
  context.fillText(compactCurrency(min), pad - 8, height - pad + 4);
}

function compactCurrency(value) {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absolute >= 1000000) return `${sign}$${formatNumber.format(absolute / 1000000)} M`;
  if (absolute >= 1000) return `${sign}$${formatNumber.format(absolute / 1000)} k`;
  return `${sign}$${formatNumber.format(absolute)}`;
}

function normalizeAmortizationRow(row) {
  return {
    Periodo: row.period,
    Cuota: row.payment,
    Interes: row.interest,
    Abono: row.capital,
    Saldo: row.balance
  };
}

function saveDraft() {
  localStorage.setItem(`${STORAGE_KEY}-draft`, JSON.stringify(collectFormState()));
}

function loadDraft() {
  const draft = localStorage.getItem(`${STORAGE_KEY}-draft`);
  if (!draft) return;
  applyFormState(JSON.parse(draft));
}

function collectFormState() {
  const state = {};
  document.querySelectorAll("form").forEach((form) => {
    state[form.dataset.calculator] = Object.fromEntries(new FormData(form).entries());
  });
  return state;
}

function applyFormState(state) {
  Object.entries(state).forEach(([calculator, values]) => {
    const form = document.querySelector(`[data-calculator="${calculator}"]`);
    if (!form) return;
    Object.entries(values).forEach(([name, value]) => {
      if (form.elements[name]) form.elements[name].value = value;
    });
  });
}

function getScenarios() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function setScenarios(scenarios) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  renderSavedScenarios();
}

function saveScenario() {
  const scenarios = getScenarios();
  const now = new Date();
  const scenario = {
    id: String(now.getTime()),
    name: `${titles[activeModule]} - ${now.toLocaleString("es-CO")}`,
    module: activeModule,
    state: collectFormState()
  };

  scenarios.unshift(scenario);
  setScenarios(scenarios.slice(0, 8));
  showToast("Escenario guardado.");
}

function renderSavedScenarios() {
  const scenarios = getScenarios();
  const list = document.getElementById("saved-list");
  document.getElementById("scenario-count").textContent = scenarios.length;

  if (!scenarios.length) {
    list.innerHTML = `<div class="empty-state">No hay escenarios guardados todavia.</div>`;
    return;
  }

  list.innerHTML = scenarios.map((scenario) => `
    <div class="saved-item">
      <div>
        <strong>${scenario.name}</strong>
        <small>${titles[scenario.module] || "Panel"}</small>
      </div>
      <button class="soft-button" type="button" data-restore="${scenario.id}">Cargar</button>
    </div>
  `).join("");

  list.querySelectorAll("[data-restore]").forEach((button) => {
    button.addEventListener("click", () => restoreScenario(button.dataset.restore));
  });
}

function restoreScenario(id) {
  const scenario = getScenarios().find((item) => item.id === id);
  if (!scenario) return;
  applyFormState(scenario.state);
  calculateAll();
  saveDraft();
  showModule(scenario.module);
  showToast("Escenario cargado.");
}

function clearScenarios() {
  setScenarios([]);
  showToast("Escenarios eliminados.");
}

function exportCurrentModule() {
  if (activeModule === "dashboard") {
    showToast("Abre un modulo de calculo para exportar.");
    return;
  }

  const data = latestData[activeModule];
  if (!data || !data.rows || !data.rows.length) {
    showToast("No hay datos exportables en este modulo.");
    return;
  }

  const csv = rowsToCsv(data.rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fincalcpro-${activeModule}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("CSV generado.");
}

function rowsToCsv(rows) {
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ];
  return lines.join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function startTutorial() {
  tutorialIndex = 0;
  tutorialActive = true;
  document.getElementById("tour-overlay").hidden = false;
  document.getElementById("tour-spotlight").hidden = false;
  document.getElementById("tour-card").hidden = false;
  renderTutorialStep();
}

function nextTutorialStep() {
  if (tutorialIndex >= tutorialSteps.length - 1) {
    closeTutorial();
    showToast("Tutorial finalizado.");
    return;
  }
  tutorialIndex += 1;
  renderTutorialStep();
}

function previousTutorialStep() {
  if (tutorialIndex === 0) return;
  tutorialIndex -= 1;
  renderTutorialStep();
}

function closeTutorial() {
  tutorialActive = false;
  document.getElementById("tour-overlay").hidden = true;
  document.getElementById("tour-spotlight").hidden = true;
  document.getElementById("tour-card").hidden = true;
  clearTutorialHighlight();
}

function renderTutorialStep() {
  const step = tutorialSteps[tutorialIndex];
  showModule(step.module, false);

  document.getElementById("tour-kicker").textContent = `Paso ${tutorialIndex + 1} de ${tutorialSteps.length}`;
  document.getElementById("tour-title").textContent = step.title;
  document.getElementById("tour-text").textContent = step.text;
  document.getElementById("tour-prev").disabled = tutorialIndex === 0;
  document.getElementById("tour-next").textContent = tutorialIndex === tutorialSteps.length - 1 ? "Finalizar" : "Siguiente >";
  document.getElementById("tour-progress").style.setProperty("--tour-progress", `${((tutorialIndex + 1) / tutorialSteps.length) * 100}%`);

  window.setTimeout(() => {
    const target = document.querySelector(step.selector);
    clearTutorialHighlight();
    if (!target) return;
    target.classList.add("tour-highlight");
    target.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    window.setTimeout(positionTutorialCard, 220);
  }, 80);
}

function clearTutorialHighlight() {
  document.querySelectorAll(".tour-highlight").forEach((element) => {
    element.classList.remove("tour-highlight");
  });
}

function positionTutorialCard() {
  if (!tutorialActive) return;

  const step = tutorialSteps[tutorialIndex];
  const target = document.querySelector(step.selector);
  const card = document.getElementById("tour-card");
  const spotlight = document.getElementById("tour-spotlight");
  if (!target) return;

  const rect = target.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const gap = 14;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxLeft = viewportWidth - cardRect.width - 16;
  const maxTop = viewportHeight - cardRect.height - 16;
  const spotlightPad = 8;

  spotlight.style.left = `${Math.max(8, rect.left - spotlightPad)}px`;
  spotlight.style.top = `${Math.max(8, rect.top - spotlightPad)}px`;
  spotlight.style.width = `${Math.min(viewportWidth - 16, rect.width + spotlightPad * 2)}px`;
  spotlight.style.height = `${Math.min(viewportHeight - 16, rect.height + spotlightPad * 2)}px`;

  let left = rect.right + gap;
  let top = rect.top;

  if (left > maxLeft) left = rect.left - cardRect.width - gap;
  if (left < 16) left = Math.min(Math.max(rect.left, 16), maxLeft);

  if (top > maxTop) top = maxTop;
  if (top < 16) top = 16;

  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
}
