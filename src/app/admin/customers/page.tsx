"use client";

import { useEffect, useState } from "react";
import {
  CardHead,
  DemoBadge,
  DemoCard,
  DemoPage,
  DemoPageBody,
  DemoTableHeader,
  DemoTableRows,
  DemoTableRow,
  KpiCard,
  KpiGrid,
  PageHeader,
} from "@/components/demo/primitives";
import { RouteError } from "@/components/admin/route-error";
import { loadCrm, type CrmData } from "./crm-data";

export const dynamic = "force-dynamic";

function CrmSkeleton() {
  return (
    <div className="grid gap-5 px-2 lg:px-5">
      <div className="h-20 rounded-xl border border-dashed border-card-border bg-background-gray-secondary_alt" />
      <div className="grid gap-5 lg:grid-cols-2">
        <DemoCard className="h-[260px]">
          <div className="h-20 rounded-xl border border-dashed border-card-border bg-background-gray-secondary_alt" />
        </DemoCard>
        <DemoCard className="h-[260px]">
          <div className="h-20 rounded-xl border border-dashed border-card-border bg-background-gray-secondary_alt" />
        </DemoCard>
      </div>
      <DemoCard className="h-[320px]">
        <div className="h-20 rounded-xl border border-dashed border-card-border bg-background-gray-secondary_alt" />
      </DemoCard>
    </div>
  );
}

function CrmEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-[200px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-card-border">
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="max-w-72 text-center text-xs leading-4 text-text-tertiary">{body}</p>
    </div>
  );
}

function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function Avatar({ name, role }: { name: string; role: string }) {
  const initials = avatarInitials(name);
  return (
    <div className="flex items-center gap-3">
      <span className="flex shrink-0 items-center justify-center rounded-full bg-background-gray-secondary_alt text-sm font-semibold text-text-secondary size-10">
        {initials}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium whitespace-nowrap text-text-primary">{name}</p>
        <p className="text-xs leading-4 font-normal text-text-tertiary">{role}</p>
      </div>
    </div>
  );
}

function PerformanceBadge({ percent }: { percent: number }) {
  const tone = percent >= 100 ? "success" : percent >= 80 ? "purple" : percent >= 60 ? "neutral" : "warning";
  return <DemoBadge tone={tone}>{percent.toFixed(0)}%</DemoBadge>;
}

function LeadsTable({ leads }: { leads: { id: string; rep: string; role: string; dealsClosed: number; revenue: string; performance: number }[] }) {
  return (
    <DemoCard>
      <CardHead title="Leads Report" />
      <div className="text-text-primary p-0">
        <DemoTableHeader cols="1fr_120px_96px_96px" bordered>
          <span>Rep Name</span>
          <span>Deals Closed</span>
          <span>Revenue</span>
          <span>Performance</span>
        </DemoTableHeader>
        {leads.length === 0 ? (
          <CrmEmpty title="No leads yet" body="Leads will appear here once CRM data is connected." />
        ) : (
          <DemoTableRows bordered>
            {leads.map((row) => (
              <DemoTableRow key={row.id} cols="1fr_120px_96px_96px">
                <Avatar name={row.rep} role={row.role} />
                <p className="text-sm font-normal text-text-primary">{row.dealsClosed}</p>
                <p className="text-sm font-medium text-text-primary">{row.revenue}</p>
                <PerformanceBadge percent={row.performance} />
              </DemoTableRow>
            ))}
          </DemoTableRows>
        )}
      </div>
    </DemoCard>
  );
}

function RecentActivities({ activities }: { activities: { id: string; actor: string; action: string; target: string; time: string }[] }) {
  return (
    <DemoCard>
      <CardHead title="Recent Activities" />
      <div className="text-text-primary flex flex-col gap-5 p-0">
        {activities.length === 0 ? (
          <CrmEmpty title="No activities yet" body="CRM activities will appear here once data is connected." />
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start justify-between gap-x-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={activity.actor} role="" />
                <div className="max-w-48 sm:max-w-64">
                  <p className="text-sm font-medium tracking-[-0.15px] text-text-primary truncate">
                    {activity.actor} {activity.action} <span className="font-semibold">{activity.target}</span>
                  </p>
                  <p className="mt-0.5 text-xs leading-4 text-text-tertiary">{activity.time}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </DemoCard>
  );
}

export default function Page() {
  const [data, setData] = useState<CrmData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCrm()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load CRM data.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (data === null) {
    return <CrmSkeleton />;
  }

  if (error) {
    return (
      <DemoPage>
        <PageHeader title="CRM" subtitle="Analyze trends, track growth, and make data-driven decisions." />
        <DemoPageBody>
          <RouteError
            error={new Error(error)}
            reset={() => {
              setError(null);
              setData(null);
            }}
          />
        </DemoPageBody>
      </DemoPage>
    );
  }

  const hasData = data.kpis.length > 0 || data.chart.length > 0 || data.leads.length > 0 || data.activities.length > 0;

  return (
    <DemoPage>
      <PageHeader title="CRM" subtitle="Analyze trends, track growth, and make data-driven decisions." />
      <DemoPageBody>
        {hasData ? (
          <>
            <KpiGrid>
              {data.kpis.map((kpi) => (
                <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} delta={kpi.delta ?? undefined} deltaTone={kpi.deltaTone} />
              ))}
            </KpiGrid>
            <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
              <DemoCard className="min-w-0 space-y-5">
                <CardHead title="Lead growth &amp; Conversion" />
                <div className="relative h-[300px] w-full p-0">
                  {data.chart.length === 0 ? (
                    <CrmEmpty title="No conversion data yet" body="Lead growth and conversion will chart here once CRM activity is recorded." />
                  ) : (
                    <div className="h-full" />
                  )}
                </div>
              </DemoCard>
              <DemoCard>
                <LeadsTable leads={data.leads} />
              </DemoCard>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <DemoCard className="h-full min-w-0">
                <CardHead title="Upcoming Tasks &amp; Meetings" />
                <CrmEmpty title="No upcoming tasks" body="Scheduled tasks and meetings will appear here once CRM data is connected." />
              </DemoCard>
              <DemoCard>
                <RecentActivities activities={data.activities} />
              </DemoCard>
            </div>
          </>
        ) : (
          <CrmEmpty
            title="No CRM data yet"
            body="No CRM data source is connected. Connect a CRM source to see leads, revenue, conversion, and activity here."
          />
        )}
      </DemoPageBody>
    </DemoPage>
  );
}
