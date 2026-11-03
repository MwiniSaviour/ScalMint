"use client";

export type CalEvent = { id: string; date: string; label: string; kind: string };

export function MonthCalendar({
  year,
  month,
  events,
}: {
  year: number;
  month: number;
  events: CalEvent[];
}) {
  const first = new Date(Date.UTC(year, month, 1));
  const startPad = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: { day: number | null; iso: string | null }[] = [];
  for (let i = 0; i < startPad; i += 1) cells.push({ day: null, iso: null });
  for (let d = 1; d <= daysInMonth; d += 1) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, iso });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, iso: null });
  const byDay = new Map<string, CalEvent[]>();
  for (const e of events) {
    const list = byDay.get(e.date) ?? [];
    list.push(e);
    byDay.set(e.date, list);
  }
  return (
    <div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium tracking-wide text-text-tertiary uppercase">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-t border-l border-card-border">
        {cells.map((c, i) => (
          <div key={i} className="min-h-24 border-r border-b border-card-border p-1.5">
            {c.day && <p className="text-xs text-text-secondary">{c.day}</p>}
            <ul className="mt-1 space-y-1">
              {(c.iso ? byDay.get(c.iso) ?? [] : []).map((e) => (
                <li key={e.id} className="truncate rounded bg-background-gray-primary px-1 py-0.5 text-[11px]">
                  <span className="text-text-tertiary">{e.kind}</span> {e.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
