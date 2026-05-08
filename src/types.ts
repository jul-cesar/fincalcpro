export type ModuleId =
  | "dashboard"
  | "assistant"
  | "simple"
  | "compound"
  | "rates"
  | "annuity"
  | "amortization"
  | "project"
  | "cashflow";

export type AmortizationMethod = "french" | "german" | "american";
export type AnnuityTiming = "end" | "beginning";

export type FormState = {
  simple: { principal: number; rate: number; periods: number };
  compound: { principal: number; rate: number; periods: number };
  rates: { rate: number; sourceFrequency: number; targetFrequency: number };
  annuity: { futureValue: number; rate: number; periods: number; timing: AnnuityTiming };
  amortization: { method: AmortizationMethod; loan: number; rate: number; periods: number };
  project: { discountRate: number; flowA: string; flowB: string };
  cashflow: { initial: number; payment: number; periods: number; growth: number; discountRate: number };
};

export type SavedScenario = {
  id: string;
  name: string;
  module: ModuleId;
  state: FormState;
};

export type TableRow = Record<string, string | number>;
