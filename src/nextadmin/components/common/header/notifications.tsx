"use client";

import { BellIcon } from "@/nextadmin/components/common/header/icons";
import { Button } from "@/nextadmin/components/tailgrids/core/button";
import { OverlayWrapper } from "@/nextadmin/components/tailgrids/core/overlay";
import { Popover } from "@/nextadmin/components/tailgrids/core/popover";
import { ScrollArea, ScrollAreaViewport, ScrollBar } from "@/nextadmin/components/tailgrids/core/scroll-area";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Header, Heading } from "react-aria-components";
import { opsFetch } from "@/lib/ops/client-fetch";

type Alert = { id: string; title: string; severity: string; state: string };

export function NotificationsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const q = useQuery({
    queryKey: ["ops-work", "bell"],
    queryFn: async () => {
      const res = await opsFetch<{ alerts: Alert[] }>("/api/admin/work");
      if (!res.ok || !res.data) return [] as Alert[];
      return res.data.alerts;
    },
    refetchInterval: 60_000,
  });
  const alerts = q.data ?? [];
  const unread = alerts.filter((a) => a.state === "OPEN").length;

  return (
    <OverlayWrapper isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button
        aria-label={unread ? `${unread} open alerts` : "Alerts"}
        appearance="outline"
        size="sm"
        className="relative size-10 p-0"
      >
        <BellIcon />
        {unread > 0 && <span className="absolute top-1 right-1 size-2 rounded-full bg-error-500" aria-hidden />}
      </Button>
      <Popover className="w-80 p-0">
        <Header className="border-b border-card-border px-4 py-3">
          <Heading slot="title" className="text-sm font-medium">
            Alerts
          </Heading>
        </Header>
        <ScrollArea className="h-72">
          <ScrollAreaViewport>
            {alerts.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-text-tertiary">No open alerts.</p>
            ) : (
              <ul>
                {alerts.map((a) => (
                  <li key={a.id} className="border-b border-card-border px-4 py-3 text-sm">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-text-tertiary">
                      {a.severity} · {a.state}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </ScrollAreaViewport>
          <ScrollBar />
        </ScrollArea>
        <div className="border-t border-card-border px-4 py-2 text-right">
          <Link href="/admin/work" className="text-xs underline">
            Work queue
          </Link>
        </div>
      </Popover>
    </OverlayWrapper>
  );
}
