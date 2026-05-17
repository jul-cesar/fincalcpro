type ModulePlaceholderProps = {
  title: string
  description: string
}

export function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return (
    <section className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-6 text-card-foreground">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </section>
  )
}
