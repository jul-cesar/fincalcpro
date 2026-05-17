type ResultItem = {
  label: string
  value: string
  tone?: "positive" | "negative"
}

type ResultPanelProps = {
  title: string
  items: ResultItem[]
  className?: string
}

export function ResultPanel({ title, items, className }: ResultPanelProps) {
  return (
    <section className={`self-start rounded-3xl border border-border/60 p-6 text-card-foreground shadow-sm ${className ?? ""}`}>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <ul className="mt-4 grid gap-3">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3 text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span
              className={
                item.tone === "positive"
                  ? "font-semibold text-emerald-600"
                  : item.tone === "negative"
                  ? "font-semibold text-rose-600"
                  : "font-semibold text-foreground"
              }
            >
              {item.value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
