import Decimal from "decimal.js"
import { z } from "zod"

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

export const positiveSchema = z.number().finite().nonnegative()
export const periodsSchema = z.number().finite().int().positive()

const D = (value: Decimal.Value) => new Decimal(value)
const rate = (value: Decimal.Value) => D(value).div(100)
const n = (value: Decimal.Value) => D(value).toNumber()

export function simpleInterest(principal: number, ratePercent: number, periods: number) {
  const p = D(principal)
  const i = rate(ratePercent)
  const count = n(periods)
  const interest = p.mul(i).mul(count)
  const amount = p.plus(interest)
  const series = Array.from({ length: Math.min(count, 60) + 1 }, (_, period) =>
    p.plus(p.mul(i).mul(period)).toNumber()
  )

  return { interest: interest.toNumber(), amount: amount.toNumber(), decimalRate: i.toNumber(), series }
}

export function compoundInterest(principal: number, ratePercent: number, periods: number) {
  const p = D(principal)
  const i = rate(ratePercent)
  const count = n(periods)
  const factor = D(1).plus(i).pow(count)
  const amount = p.mul(factor)
  const interest = amount.minus(p)
  const series = Array.from({ length: Math.min(count, 60) + 1 }, (_, period) =>
    p.mul(D(1).plus(i).pow(period)).toNumber()
  )

  return { interest: interest.toNumber(), amount: amount.toNumber(), factor: factor.toNumber(), series }
}

export function convertEffectiveRate(ratePercent: number, sourceFrequency: number, targetFrequency: number) {
  const sourceRate = rate(ratePercent)
  const annualEffective = D(1).plus(sourceRate).pow(sourceFrequency).minus(1)
  const targetRate = D(1).plus(annualEffective).pow(D(1).div(targetFrequency)).minus(1)

  return {
    sourceRate: sourceRate.toNumber(),
    annualEffective: annualEffective.toNumber(),
    targetRate: targetRate.toNumber(),
  }
}

export function annuityPayment(
  futureValue: number,
  ratePercent: number,
  periods: number,
  timing: "end" | "beginning"
) {
  const fv = D(futureValue)
  const i = rate(ratePercent)
  const count = n(periods)
  const timingFactor = timing === "beginning" ? D(1).plus(i) : D(1)
  const factor = i.isZero()
    ? D(count).mul(timingFactor)
    : D(1).plus(i).pow(count).minus(1).div(i).mul(timingFactor)
  const payment = factor.isZero() ? D(0) : fv.div(factor)
  const rows = buildAnnuityRows(payment.toNumber(), ratePercent, count, timing)
  const totalDeposits = payment.mul(count)
  const finalBalance = D(rows.at(-1)?.balance ?? 0)

  return {
    payment: payment.toNumber(),
    totalDeposits: totalDeposits.toNumber(),
    totalInterest: finalBalance.minus(totalDeposits).toNumber(),
    rows,
  }
}

export function buildAnnuityRows(paymentValue: number, ratePercent: number, periods: number, timing: "end" | "beginning") {
  let balance = D(0)
  const payment = D(paymentValue)
  const i = rate(ratePercent)
  const rows: Array<{ period: number; payment: number; interest: number; balance: number }> = []

  for (let period = 1; period <= periods; period += 1) {
    let interest = D(0)
    if (timing === "beginning") {
      balance = balance.plus(payment)
      interest = balance.mul(i)
      balance = balance.plus(interest)
    } else {
      interest = balance.mul(i)
      balance = balance.plus(interest).plus(payment)
    }

    rows.push({
      period,
      payment: payment.toNumber(),
      interest: interest.toNumber(),
      balance: balance.toNumber(),
    })
  }

  return rows
}

export function amortization(
  method: "french" | "german" | "american",
  loan: number,
  ratePercent: number,
  periods: number
) {
  const principal = D(loan)
  const i = rate(ratePercent)
  const count = n(periods)
  let balance = principal
  const rows: Array<{ period: number; payment: number; interest: number; capital: number; balance: number }> = []

  for (let period = 1; period <= count; period += 1) {
    const interest = balance.mul(i)
    let capital: Decimal
    let payment: Decimal

    if (method === "german") {
      capital = principal.div(count)
      payment = capital.plus(interest)
    } else if (method === "american") {
      capital = period === count ? principal : D(0)
      payment = interest.plus(capital)
    } else {
      payment = i.isZero()
        ? principal.div(count)
        : principal.mul(i.div(D(1).minus(D(1).plus(i).pow(-count))))
      capital = payment.minus(interest)
    }

    capital = Decimal.min(capital, balance)
    balance = Decimal.max(D(0), balance.minus(capital))
    rows.push({
      period,
      payment: payment.toNumber(),
      interest: interest.toNumber(),
      capital: capital.toNumber(),
      balance: balance.toNumber(),
    })
  }

  const totalInterest = rows.reduce((sum, row) => sum + row.interest, 0)
  return { rows, totalInterest, totalPaid: loan + totalInterest }
}

export function parseFlows(value: string) {
  return value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter(Number.isFinite)
}

export function netPresentValue(flows: number[], rateDecimal: number) {
  const i = D(rateDecimal)
  return flows
    .reduce((total, flow, index) => total.plus(D(flow).div(D(1).plus(i).pow(index))), D(0))
    .toNumber()
}

export function internalRateOfReturn(flows: number[]) {
  if (!flows.some((flow) => flow < 0) || !flows.some((flow) => flow > 0)) return Number.NaN

  let low = -0.95
  let high = 5
  let npvLow = netPresentValue(flows, low)
  const npvHigh = netPresentValue(flows, high)

  if (Math.sign(npvLow) === Math.sign(npvHigh)) return Number.NaN

  for (let iteration = 0; iteration < 120; iteration += 1) {
    const mid = (low + high) / 2
    const npvMid = netPresentValue(flows, mid)
    if (Math.abs(npvMid) < 0.0001) return mid
    if (Math.sign(npvMid) === Math.sign(npvLow)) {
      low = mid
      npvLow = npvMid
    } else {
      high = mid
    }
  }

  return (low + high) / 2
}

export function cashflowSeries(initial: number, payment: number, periods: number, growthPercent: number) {
  const flows = [initial]
  const growth = rate(growthPercent)
  for (let period = 1; period <= Math.max(1, Math.min(60, periods)); period += 1) {
    flows.push(D(payment).mul(D(1).plus(growth).pow(period - 1)).toNumber())
  }
  return flows
}
