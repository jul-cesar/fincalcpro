import type { ReactNode } from "react"

type TableProps = {
  headers: string[]
  rows: Array<Array<ReactNode>>
}

export function Table({ headers, rows }: TableProps) {
  return (
    <div className="self-start overflow-hidden rounded-3xl border border-border/60 bg-card">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 text-left font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((row, index) => (
            <tr key={`row-${index}`} className="bg-card/80">
              {row.map((cell, cellIndex) => (
                <td key={`cell-${index}-${cellIndex}`} className="px-4 py-3 text-foreground/90">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
