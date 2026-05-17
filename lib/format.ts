export const formatCurrency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

export const formatNumber = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 4,
})

export function asPercent(value: number) {
  return `${formatNumber.format(value * 100)}%`
}
