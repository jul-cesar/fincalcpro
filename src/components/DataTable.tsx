import {
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  useReactTable
} from "@tanstack/react-table";
import type { TableRow } from "../types";

type Props = {
  rows: TableRow[];
};

export function DataTable({ rows }: Props) {
  const columns = Object.keys(rows[0] ?? {}).map((key) => ({
    accessorKey: key,
    header: key.replace(/([A-Z])/g, " $1").trim()
  })) as ColumnDef<TableRow>[];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  if (!rows.length) return null;

  return (
    <div className="table-shell">
      <table>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{String(cell.getValue() ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
