"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);

  const updateCoords = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const width = Math.max(320, Math.min(480, rect.width * 2));
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const below = window.innerHeight - rect.bottom - 8;
    const above = rect.top - 8;
    const panelHeight = panelRef.current?.offsetHeight ?? 0;
    const cap = window.innerHeight * 0.6;
    const openAbove = panelHeight > 0 ? below < Math.min(panelHeight, cap) && above > below : false;
    const maxHeight = Math.min(cap, openAbove ? above : below);
    const top = openAbove ? Math.max(8, rect.top - panelHeight - 8) : rect.bottom + 8;
    setCoords({ top, left, width, maxHeight });
  }, []);

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
    if (!open) {
      setCoords(null);
      return;
    }
    setQ("");
    setActive(0);
    updateCoords();
    // Focus the search input and re-measure once the panel is in the DOM.
    requestAnimationFrame(() => {
      updateCoords();
      searchRef.current?.focus();
    });
  }, [open, updateCoords]);

  // Keep the panel anchored to the trigger while it is open; close on outside interaction or Escape.
  useEffect(() => {
    if (!open) return;
    const onReposition = () => updateCoords();
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, { capture: true, passive: true });
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, { capture: true });
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, updateCoords]);

  function go(target: Row | "portfolio") {
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
    }
  }

  const triggerName = current ? current.name : "All projects";
  const loadState = query.isLoading ? "loading" : query.isError ? "error" : null;

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`Project scope: ${triggerName}`}
        ref={triggerRef}
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
            <span className="text-text-tertiary" aria-hidden>
              ▾
            </span>
          </>
        )}
      </button>
      {open && coords
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Switch project"
              className="fixed z-50 flex flex-col overflow-hidden rounded-xl border border-card-border bg-card-background shadow-xs outline-none"
              style={{ top: coords.top, left: coords.left, width: coords.width, maxHeight: coords.maxHeight }}
              onKeyDown={onKey}
            >
              <input
                ref={searchRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                placeholder="Find project…"
                aria-label="Search projects"
                className="shrink-0 border-b border-card-border bg-transparent px-3 py-2.5 text-sm outline-none"
                aria-controls={listId}
                aria-activedescendant={`${listId}-${active}`}
              />
              <ul id={listId} role="listbox" aria-label="Projects" className="min-h-0 flex-1 overflow-y-auto p-1">
                {loadState === "loading" && (
                  <li className="px-3 py-6 text-center text-sm text-text-tertiary">Loading projects…</li>
                )}
                {loadState === "error" && (
                  <li className="px-3 py-6 text-center text-sm">
                    <p className="text-text-tertiary">Failed to load projects.</p>
                    <button
                      type="button"
                      className="mt-2 rounded-md border border-card-border px-3 py-1.5 text-xs text-text-primary hover:bg-background-gray-primary"
                      onClick={() => void query.refetch()}
                    >
                      Retry
                    </button>
                  </li>
                )}
                {!loadState && query.data && filtered.length <= 1 && q.trim() && (
                  <li className="px-3 py-6 text-center text-sm text-text-tertiary">
                    No projects match “{q.trim()}”.
                  </li>
                )}
                {!loadState &&
                  filtered.map((item, i) => {
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
              <div className="flex shrink-0 justify-between border-t border-card-border px-3 py-2 text-xs">
                <button
                  type="button"
                  className="text-text-secondary hover:text-text-primary"
                  onClick={() => {
                    setOpen(false);
                    router.push("/admin/projects");
                  }}
                >
                  Manage projects
                </button>
                <button
                  type="button"
                  className="text-text-secondary hover:text-text-primary"
                  onClick={() => {
                    setOpen(false);
                    router.push("/admin/projects?new=1");
                  }}
                >
                  Create project
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
