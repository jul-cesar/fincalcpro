import { describe, expect, it } from "vitest";
import { annuityPayment, compoundInterest, convertEffectiveRate, netPresentValue, simpleInterest } from "./finance";

describe("financial engine", () => {
  it("calculates simple interest", () => {
    const result = simpleInterest(1_000_000, 2, 10);
    expect(result.interest).toBeCloseTo(200_000, 2);
    expect(result.amount).toBeCloseTo(1_200_000, 2);
  });

  it("calculates compound interest", () => {
    const result = compoundInterest(1_000_000, 2, 10);
    expect(result.amount).toBeCloseTo(1_218_994.42, 2);
  });

  it("converts effective monthly rate to annual equivalent", () => {
    const result = convertEffectiveRate(3, 12, 1);
    expect(result.annualEffective).toBeCloseTo(0.4257608868, 8);
  });

  it("calculates annuity payment for future value deposits", () => {
    const result = annuityPayment(8_500_000, 2.5, 24, "end");
    expect(result.payment).toBeCloseTo(262_758.97, 2);
  });

  it("calculates net present value", () => {
    const result = netPresentValue([-10_000_000, 3_200_000, 3_400_000, 3_600_000, 4_000_000], 0.12);
    expect(result).toBeCloseTo(672_083.2, 0);
  });
});
