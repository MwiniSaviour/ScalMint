"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { opsFetch } from "@/lib/ops/client-fetch";
import { StatusBadge } from "@/components/ops/StatusBadge";
import { PROJECT_SECTIONS } from "@/nextadmin/components/common/sidebar/data";
import type { HealthStatus } from "@/lib/ops/types";
import { cn } from "@/nextadmin/utils/cn";

type Row = { id: string; key: string; name: string; kind: string; status: HealthStatus; domain?: string | null };

type SwitcherData = { pinned: Row[]; recent: Row[]; all: Row[] };

function currentKey(pathname: string): string | null {
  const m = pathname.match(/^\/admin\/p\/([^/]+)/);
  return m?.[1] ?? null;
}

function currentSection(pathname: string): string | null {
  const m = pathname.match(/^\/admin\/p\/[^/]+\/([^/]+)/);
  const section = m?.[1];
  if (section && (PROJECT_SECTIONS as readonly string[]).includes(section)) return section;
  return null;
}

export default function ProjectSwitcher({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const key = currentKey(pathname);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const listId = useId();
  const abortRef = useRef<AbortController | null>(null);

  const query = useQuery({
    queryKey: ["ops-projects", "switcher"],
    queryFn: async () => {
      const res = await opsFetch<SwitcherData>("/api/admin/projects?view=switcher");
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed to load projects");
      return res.data;
    },
  });

  const all = useMemo(() => query.data?.all ?? [], [query.data?.all]);
  const current = all.find((p) => p.key === key) ?? null;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (p: Row) =>
      !needle ||
      p.name.toLowerCase().includes(needle) ||
      p.key.toLowerCase().includes(needle) ||
      p.kind.toLowerCase().includes(needle) ||
      (p.domain ?? "").toLowerCase().includes(needle);
    const pinned = (query.data?.pinned ?? []).filter(match);
    const recent = (query.data?.recent ?? []).filter(match);
    const rest = all.filter(match);
    const rows: { group: string; row: Row | "portfolio" }[] = [{ group: "All projects", row: "portfolio" }];
    for (const p of pinned) rows.push({ group: "Pinned", row: p });
    for (const p of recent) rows.push({ group: "Recent", row: p });
    for (const p of rest) rows.push({ group: "All projects", row: p });
    return rows;
  }, [q, query.data, all]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  function go(target: Row | "portfolio") {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setOpen(false);
    if (target === "portfolio") {
      router.push("/admin");
      return;
    }
    const section = currentSection(pathname);
    router.push(section ? `/admin/p/${target.key}/${section}` : `/admin/p/${target.key}`);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = filtered[active];
      if (row) go(row.row);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  const triggerName = current ? current.name : "All projects";

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Project scope: ${triggerName}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border border-card-border bg-card-background px-2 text-left text-sm text-text-primary hover:bg-background-gray-primary",
          compact ? "h-10 justify-center px-0" : "h-10",
        )}
      >
        <span className="flex size-5 items-center justify-center rounded bg-background-gray-secondary text-[10px] font-semibold">
          {current ? current.name.slice(0, 2).toUpperCase() : "All"}
        </span>
        {!compact && (
          <>
            <span className="min-w-0 flex-1 truncate">{triggerName}</span>
            <span className="text-text-tertiary">▾</span>
          </>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-labelledby={labelId}
          className="absolute z-50 mt-2 w-[min(100%,480px)] min-w-[320px] max-h-[60vh] overflow-hidden rounded-xl border border-card-border bg-card-background shadow-xs"
          onKeyDown={onKey}
        >
          <p id={labelId} className="sr-only">
            Find project
          </p>
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            placeholder="Find project…"
            className="w-full border-b border-card-border bg-transparent px-3 py-2.5 text-sm outline-none"
            aria-controls={listId}
            aria-activedescendant={`${listId}-${active}`}
          />
          <ul id={listId} role="listbox" className="max-h-[45vh] overflow-y-auto p-1">
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-text-tertiary">
                No projects yet. Create one from Manage projects.
              </li>
            )}
            {filtered.map((item, i) => {
              const selected = item.row !== "portfolio" && item.row.key === key;
              const isPortfolio = item.row === "portfolio" && !key;
              const label = item.row === "portfolio" ? "All projects" : item.row.name;
              return (
                <li key={`${item.group}-${item.row === "portfolio" ? "all" : item.row.id}-${i}`} role="none">
                  <button
                    id={`${listId}-${i}`}
                    type="button"
                    role="option"
                    aria-selected={selected || isPortfolio}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm",
                      i === active ? "bg-background-gray-primary" : "",
                    )}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(item.row)}
                  >
                    <span className="flex size-5 items-center justify-center rounded bg-background-gray-secondary text-[10px] font-semibold">
                      {item.row === "portfolio" ? "All" : item.row.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {item.row !== "portfolio" && (
                      <>
                        <span className="text-[10px] uppercase text-text-tertiary">{item.row.kind}</span>
                        <StatusBadge status={item.row.status} />
                      </>
                    )}
                    {(selected || isPortfolio) && <span className="text-xs">✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-between border-t border-card-border px-3 py-2 text-xs">
            <button type="button" className="text-text-secondary hover:text-text-primary" onClick={() => router.push("/admin/projects")}>
              Manage projects
            </button>
            <button
              type="button"
              className="text-text-secondary hover:text-text-primary"
              onClick={() => router.push("/admin/projects?new=1")}
            >
              Create project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
