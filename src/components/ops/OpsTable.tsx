import type { ReactNode } from "react";

export function OpsTable({
  columns,
  rows,
}: {
  columns: { key: string; label: string; className?: string }[];
  rows: { id: string; cells: Record<string, ReactNode> }[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-card-border">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-background-gray-secondary_alt text-xs text-text-secondary">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-2.5 ${c.className ?? ""}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-card-border">
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-3 ${c.className ?? ""}`}>
                  {row.cells[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
