import type { ReactNode } from "react";
import {
  CardMenuDots,
  DemoBadge,
  DemoCard,
  DemoPage,
  DemoPageBody,
  KpiCard,
  KpiGrid,
  PageHeader,
} from "@/components/demo/primitives";
import { loadMarketing, type MarketingKpi } from "./marketing-data";
import { CampaignChart } from "./campaign-chart";
import {
  ActivityCheckIcon,
  CoinIcon,
  CursorIcon,
  KpiMoneyIcon,
  KpiPeopleIcon,
  TargetRateIcon,
} from "./icons";

export const dynamic = "force-dynamic";

function TintedIcon({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div className={`flex size-8 items-center justify-center rounded-lg ${className}`}>
      {children}
    </div>
  );
}

const KPI_ICONS: Record<MarketingKpi["label"], ReactNode> = {
  "Total Clicks": (
    <TintedIcon className="bg-[rgba(59,130,246,0.10)] text-[#3B82F6]">
      <CursorIcon />
    </TintedIcon>
  ),
  Conversions: <KpiPeopleIcon />,
  "Conversion Rate": (
    <TintedIcon className="bg-[rgba(249,115,22,0.10)] text-[#F97316]">
      <TargetRateIcon />
    </TintedIcon>
  ),
  "Commissions Earned": <KpiMoneyIcon />,
};

function CardTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="relative mb-6 flex w-full flex-wrap items-center justify-between gap-3">
      <h3 className="leading-6 font-semibold tracking-[-0.2px] text-text-primary">{title}</h3>
      {action}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-[160px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-card-border">
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="max-w-72 text-center text-xs leading-4 text-text-tertiary">{body}</p>
    </div>
  );
}

const FUNNEL_ICONS = {
  clicks: <CursorIcon />,
  conversions: <CoinIcon />,
} as const;

export default async function MarketingPage() {
  const data = await loadMarketing();

  return (
    <DemoPage>
      <PageHeader
        title="Marketing"
        subtitle="Smarter marketing insights for faster growth."
      />
      <DemoPageBody>
        <KpiGrid>
          {data.kpis.map((kpi) => (
            <KpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              icon={KPI_ICONS[kpi.label]}
              delta={kpi.delta?.value}
              deltaTone={kpi.delta?.tone}
              deltaLabel="vs previous 30 days"
            />
          ))}
        </KpiGrid>

        <div className="grid gap-5 lg:grid-cols-[9fr_5fr]">
          <DemoCard className="min-w-0">
            <CampaignChart days={data.chart} />
          </DemoCard>

          <DemoCard>
            <CardTitle title="Campaign Visitors" action={<CardMenuDots />} />
            <div className="text-text-primary p-0">
              {data.sources.length === 0 ? (
                <EmptyState
                  title="No clicks recorded yet"
                  body="Traffic by source will appear here once affiliates start sending clicks."
                />
              ) : (
                <>
                  <div aria-hidden="true" className="mb-5 flex w-full gap-1">
                    {data.sources.map((source) => (
                      <div
                        key={source.source}
                        className="h-6 rounded-sm"
                        style={{ width: `${source.share}%`, backgroundColor: source.color }}
                      />
                    ))}
                  </div>
                  <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-text-secondary">
                    {data.sources.map((source) => (
                      <div key={source.source} className="flex items-center gap-1">
                        <span
                          aria-hidden="true"
                          className="size-2.5 rounded-xs ring-1 ring-inset ring-black/10"
                          style={{ backgroundColor: source.color }}
                        />
                        {source.source}
                      </div>
                    ))}
                  </div>
                  <hr className="mb-6 border-t border-border-secondary-alt" />
                  <div className="mb-5 flex items-center justify-between">
                    <p className="w-1/2 text-sm font-medium text-text-tertiary">Source</p>
                    <div className="flex gap-3">
                      <p className="w-16.5 text-sm font-medium text-text-tertiary">Clicks</p>
                      <p className="w-16.5 text-right text-sm font-medium text-text-tertiary">Conv.</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-5">
                    {data.sources.map((source) => (
                      <div key={source.source} className="flex items-center justify-between">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-background-gray-secondary_alt text-xs font-semibold uppercase text-text-secondary">
                            {source.source.charAt(0)}
                          </span>
                          <p className="truncate text-sm leading-5 font-medium text-text-primary">
                            {source.source}
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <p className="w-16.5 text-sm font-medium tabular-nums text-text-primary">
                            {source.clicksLabel}
                          </p>
                          <p className="w-16.5 text-right text-sm font-medium tabular-nums text-text-primary">
                            {source.conversionsLabel}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 text-xs leading-4 text-text-tertiary">Last 30 days</p>
                </>
              )}
              {data.unattributedConversions > 0 ? (
                <p className="mt-3 text-xs leading-4 text-text-tertiary">
                  {data.unattributedConversions.toLocaleString("en")}{" "}
                  {data.unattributedConversions === 1
                    ? "conversion without an attributed click is"
                    : "conversions without an attributed click are"}{" "}
                  excluded from the source breakdown.
                </p>
              ) : null}
            </div>
          </DemoCard>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <DemoCard className="h-full">
            <div className="relative mb-6 flex w-full flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="leading-6 font-semibold tracking-[-0.2px] text-text-primary">
                  Audience Insights
                </h3>
                <p className="mt-1 text-xs leading-4 tracking-[-0.2px] text-text-secondary">
                  Who is engaging with your campaigns
                </p>
              </div>
              <CardMenuDots />
            </div>
            <EmptyState
              title="No audience data yet"
              body="Visitor demographics are not collected for affiliate campaigns, so new vs returning segments cannot be shown."
            />
          </DemoCard>

          <DemoCard>
            <CardTitle title="Conversion Funnel" action={<CardMenuDots />} />
            <div className="text-text-primary space-y-5 p-0">
              {data.funnelHasData ? (
                <>
                  {data.funnel.map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-x-6">
                      <div className="flex max-w-31 grow items-center gap-2">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background-gray-secondary_alt text-icon-secondary">
                          {FUNNEL_ICONS[row.key as keyof typeof FUNNEL_ICONS]}
                        </span>
                        <p className="text-sm leading-5 font-medium text-text-secondary">{row.label}</p>
                      </div>
                      <div className="flex max-w-none flex-1 items-center gap-3">
                        <div
                          className="relative h-1.5 w-full rounded-full"
                          role="progressbar"
                          aria-label={row.label}
                          aria-valuemax={100}
                          aria-valuemin={0}
                          aria-valuenow={Math.min(100, Math.max(0, Math.round(row.percent)))}
                          aria-valuetext={row.percentLabel}
                          style={{ backgroundColor: "var(--color-border-primary)" }}
                        >
                          <div className="size-full overflow-hidden rounded-full">
                            <div
                              className="size-full rounded-full"
                              style={{
                                transform: `translateX(-${100 - Math.min(100, Math.max(0, row.percent))}%)`,
                                backgroundColor: "var(--color-brand-500)",
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-sm leading-none font-medium text-text-secondary">
                          {row.percentLabel}
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs leading-4 text-text-tertiary">
                    Last 30 days. Impressions and CTR are not tracked for affiliate campaigns — the
                    funnel starts at affiliate clicks.
                  </p>
                </>
              ) : (
                <EmptyState
                  title="No clicks recorded yet"
                  body="The funnel will populate once affiliates start sending traffic."
                />
              )}
            </div>
          </DemoCard>
        </div>

        <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
          <DemoCard className="min-w-0">
            <CardTitle title="Product Performance" action={<CardMenuDots />} />
            <div className="text-text-primary p-0">
              <div className="overflow-x-auto">
                <table className="border-separate border-spacing-0 overflow-clip border-border-primary text-left rounded-lg border w-full min-w-175">
                  <caption className="sr-only">Product performance, last 30 days</caption>
                  <thead className="text-title-50 [&_th]:border-b [&_th]:border-border-primary [&_th]:text-xs">
                    <tr className="not-last:*:border-border-primary not-last:[&>td]:border-b not-last:[&>th]:border-b [&>th]:border-t">
                      <th scope="col" className="px-6 py-2.5 font-semibold text-text-secondary">Product</th>
                      <th scope="col" className="px-6 py-2.5 font-semibold text-text-secondary">Clicks</th>
                      <th scope="col" className="px-6 py-2.5 font-semibold text-text-secondary">Conversions</th>
                      <th scope="col" className="px-6 py-2.5 font-semibold text-text-secondary">Conv. %</th>
                      <th scope="col" className="px-6 py-2.5 font-semibold text-text-secondary">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.products.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-8 text-center text-sm text-text-tertiary"
                        >
                          No product activity yet — clicks and conversions will appear here.
                        </td>
                      </tr>
                    ) : (
                      data.products.map((row) => (
                        <tr
                          key={row.id}
                          className="not-last:*:border-border-primary not-last:[&>td]:border-b not-last:[&>th]:border-b [&>td]:border-none"
                        >
                          <td className="py-3.5 font-medium px-6 text-sm text-text-primary">
                            {row.name}
                          </td>
                          <td className="py-3.5 font-medium px-6 text-sm tabular-nums text-text-primary">
                            {row.clicksLabel}
                          </td>
                          <td className="py-3.5 font-medium px-6 text-sm tabular-nums text-text-primary">
                            {row.conversionsLabel}
                          </td>
                          <td className="py-3.5 font-medium px-6 text-sm tabular-nums text-text-primary">
                            {row.conversionRate === "—" ? (
                              "—"
                            ) : (
                              <DemoBadge tone="neutral">{row.conversionRate}</DemoBadge>
                            )}
                          </td>
                          <td className="py-3.5 font-medium px-6 text-sm tabular-nums text-text-primary">
                            {row.commissionLabel}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs leading-4 text-text-tertiary">
                Last 30 days
                {data.genericClicks > 0
                  ? ` · ${data.genericClicks.toLocaleString("en")} clicks via generic affiliate links not attributed to a product`
                  : null}
              </p>
            </div>
          </DemoCard>

          <DemoCard>
            <CardTitle title="Recent Activities" />
            <div className="text-text-primary flex flex-col gap-5 p-0">
              {data.activities.length === 0 ? (
                <EmptyState
                  title="No conversions yet"
                  body="Verified conversions will appear here as affiliates close sales."
                />
              ) : (
                data.activities.map((activity) => (
                  <div key={activity.id} className="flex items-start justify-between gap-x-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background-gray-secondary_alt">
                        <ActivityCheckIcon />
                      </span>
                      <div className="max-w-48 sm:max-w-64">
                        <p className="truncate text-sm leading-5 font-medium tracking-[-0.15px] text-text-primary">
                          {activity.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-4 text-text-tertiary">{activity.subtitle}</p>
                      </div>
                    </div>
                    <p className="shrink-0 truncate text-xs leading-4 text-text-tertiary">
                      {activity.timeLabel}
                    </p>
                  </div>
                ))
              )}
            </div>
          </DemoCard>
        </div>
      </DemoPageBody>
    </DemoPage>
  );
}
