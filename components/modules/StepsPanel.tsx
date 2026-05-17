import { BlockMath } from "react-katex"

type StepsPanelProps = {
  steps: string[]
  formulas?: string[]
}

export function StepsPanel({ steps, formulas }: StepsPanelProps) {
  return (
    <section className="self-start rounded-3xl border border-border/70 bg-card/90 p-6 text-card-foreground shadow-sm">
      <h3 className="text-base font-semibold text-foreground">Procedimiento</h3>
      <ol className="mt-4 grid gap-3 text-sm text-muted-foreground">
        {steps.map((step) => (
          <li key={step} className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
            {step}
          </li>
        ))}
      </ol>
      {formulas?.length ? (
        <div className="mt-4 grid gap-2 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
          {formulas.map((formula) => (
            <div key={formula} className="overflow-x-auto text-foreground">
              <BlockMath math={formula} />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
