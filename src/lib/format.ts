export const formatCurrency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
});

export const formatNumber = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 4
});

export function compactCurrency(value: number) {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absolute >= 1_000_000) return `${sign}$${formatNumber.format(absolute / 1_000_000)} M`;
  if (absolute >= 1_000) return `${sign}$${formatNumber.format(absolute / 1_000)} k`;
  return `${sign}$${formatNumber.format(absolute)}`;
}

export function asPercent(value: number) {
  return `${formatNumber.format(value * 100)}%`;
}
