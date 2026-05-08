import { describe, expect, it } from "vitest";
import { answerFinancialPrompt } from "./assistant";

describe("financial assistant", () => {
  it("recognizes a future value annuity problem", () => {
    const response = answerFinancialPrompt(
      "Cuanto se debe depositar al final de cada mes durante dos anos al 2,50% mensual para reunir 8.500.000"
    );

    expect(response.suggestedModule).toBe("annuity");
    expect(response.suggestion?.module).toBe("annuity");
    expect(response.answer.replace(/\s/g, "")).toContain("$262.759");
  });

  it("routes VPN problems to project module", () => {
    const response = answerFinancialPrompt("Calcular VPN y TIR de dos alternativas");
    expect(response.suggestedModule).toBe("project");
  });
});
