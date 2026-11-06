import type { ReactNode } from "react";
import Link from "next/link";
import {
  CardHead,
  DemoCard,
  DemoLegendGroup,
  DemoPage,
  DemoPageBody,
  LegendItem,
  KpiCard,
  KpiGrid,
  PageHeader,
} from "@/components/demo/primitives";
import { MousePointerClick, Banknote, Package, Users } from "lucide-react";
import { loadDashboard } from "./dashboard-data";
import { SalesChart } from "./sales-chart";
import { InventoryDonut } from "./inventory-donut";
import { TransactionsTable } from "./transactions-table";
import { MAP_PATHS, MAP_TRANSLATE, MAP_VIEW_BOX } from "./map-paths";

export const dynamic = "force-dynamic";

function CardMenuLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex size-7 items-center justify-center rounded-lg text-text-primary outline-none transition hover:bg-button-primary-outline-hover-background focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5.83333 10.0002C5.83333 10.9206 5.08714 11.6668 4.16667 11.6668C3.24619 11.6668 2.5 10.9206 2.5 10.0002C2.5 9.07969 3.24619 8.3335 4.16667 8.3335C5.08714 8.3335 5.83333 9.07969 5.83333 10.0002Z" fill="currentColor" />
        <path d="M11.6667 10.0002C11.6667 10.9206 10.9205 11.6668 10 11.6668C9.07953 11.6668 8.33333 10.9206 8.33333 10.0002C8.33333 9.07969 9.07953 8.3335 10 8.3335C10.9205 8.3335 11.6667 9.07969 11.6667 10.0002Z" fill="currentColor" />
        <path d="M17.5 10.0002C17.5 10.9206 16.7538 11.6668 15.8333 11.6668C14.9129 11.6668 14.1667 10.9206 14.1667 10.0002C14.1667 9.07969 14.9129 8.3335 15.8333 8.3335C16.7538 8.3335 17.5 9.07969 17.5 10.0002Z" fill="currentColor" />
      </svg>
    </Link>
  );
}

function TintedIcon({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div className={`flex size-8 items-center justify-center rounded-lg ${className}`}>
      {children}
    </div>
  );
}

function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return initials.join("");
}

export default async function EcommerceDashboardPage() {
  const data = await loadDashboard();

  const { inventory } = data;
  const regionRows = data.regions;

  return (
    <DemoPage>
      <PageHeader
        title="E-commerce"
        subtitle="Track sales, monitor orders, and analyze store performance."
      />
      <DemoPageBody>
        <KpiGrid>
          <KpiCard
            label="Total Clicks"
            value={data.kpis.totalClicks}
            icon={
              <TintedIcon className="bg-[rgba(59,130,246,0.10)] text-blue-700">
                <MousePointerClick size={18} strokeWidth={1.5} />
              </TintedIcon>
            }
          />
          <KpiCard
            label="Total Profit"
            value={data.kpis.totalProfit}
            icon={
              <TintedIcon className="bg-[rgba(34,197,94,0.10)] text-green-700">
                <Banknote size={18} strokeWidth={1.5} />
              </TintedIcon>
            }
          />
          <KpiCard
            label="Total Orders"
            value={data.kpis.totalOrders}
            icon={
              <TintedIcon className="bg-[rgba(249,115,22,0.10)] text-orange-700">
                <Package size={18} strokeWidth={1.5} />
              </TintedIcon>
            }
          />
          <KpiCard
            label="Unique customer emails"
            value={data.kpis.uniqueCustomerEmails}
            icon={
              <TintedIcon className="bg-[rgba(168,85,247,0.10)] text-purple-700">
                <Users size={18} strokeWidth={1.5} />
              </TintedIcon>
            }
          />
        </KpiGrid>

        <DemoCard>
          <SalesChart sales={data.sales} />
        </DemoCard>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,519fr)_minmax(0,558fr)]">
          <DemoCard className="flex flex-col p-2 pt-5">
            <div className="mb-6 flex w-full items-center justify-between gap-3 px-3">
              <h3 className="leading-6 font-semibold tracking-[-0.2px] text-text-primary">
                Inventory Overview
              </h3>
              <CardMenuLink href="/admin/products" label="Open products" />
            </div>
            <div className="flex flex-1 flex-col justify-between lg:mt-10">
              <div className="p-0 text-text-primary">
                <div className="h-42.25 w-full">
                  <InventoryDonut total={inventory.total} live={inventory.live} />
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 divide-x divide-card-border rounded-[9px] bg-background-gray-secondary_alt px-11 py-2">
              <div className="flex flex-col items-center pt-3">
                <div>
                  <div className="mb-0.5 text-xs leading-4 text-text-tertiary">Total Products</div>
                  <p className="leading-6 font-semibold text-text-primary">
                    {inventory.total.toLocaleString("en")}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center pt-3">
                <div>
                  <div className="mb-0.5 text-xs leading-4 text-text-tertiary">Live</div>
                  <p className="leading-6 font-semibold text-text-primary">
                    {inventory.live.toLocaleString("en")}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center pt-3">
                <div>
                  <div className="mb-0.5 text-xs leading-4 text-text-tertiary">Coming Soon</div>
                  <p className="leading-6 font-semibold text-text-primary">
                    {inventory.comingSoon.toLocaleString("en")}
                  </p>
                </div>
              </div>
            </div>
          </DemoCard>

          <DemoCard>
            <CardHead title="Top Product" action={<CardMenuLink href="/admin/conversions" label="Open conversions" />} />
            {data.topProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-tertiary">No product sales yet</p>
            ) : (
              <div className="flex flex-col p-0 text-text-primary">
                {data.topProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between border-b border-border-primary py-3 first:pt-0 last:border-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 select-none items-center justify-center rounded-full bg-background-gray-secondary_alt text-sm font-semibold text-text-secondary">
                        {avatarInitials(product.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="mb-1 truncate text-sm leading-5 font-medium text-text-primary">
                          {product.name}
                        </p>
                        <small className="block text-xs leading-4 text-text-tertiary">
                          {product.sales.toLocaleString("en")} sales · #{index + 1}
                        </small>
                      </div>
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      <p className="text-sm leading-5 font-medium text-text-primary">{product.amountLabel}</p>
                      {product.shareLabel ? (
                        <p className="mt-1 text-xs leading-4 text-text-tertiary">{product.shareLabel}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DemoCard>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,546fr)_minmax(0,531fr)]">
          <DemoCard>
            <CardHead title="Traffic Sources" action={<CardMenuLink href="/admin/analytics" label="Open analytics" />} />
            <div className="flex flex-col p-0 text-text-primary">
              <div className="mb-3.5 flex items-center justify-between">
                <span className="block text-sm leading-5 font-medium text-text-tertiary">Source</span>
                <span className="block text-sm leading-5 font-medium text-text-tertiary">Clicks</span>
              </div>
              {data.traffic.length === 0 ? (
                <p className="py-6 text-center text-sm text-text-tertiary">No traffic data yet</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.traffic.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-2">
                      <div className="flex h-8 max-w-[90%] min-w-0 flex-1 items-center">
                        <div
                          className="flex h-full min-w-0 items-center rounded bg-background-gray-secondary_alt px-3"
                          style={{ width: `${row.width}%` }}
                        >
                          <span className="truncate text-sm font-medium text-text-primary">{row.label}</span>
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-text-primary">{row.countLabel}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DemoCard>

          <DemoCard>
            <CardHead title="Top Regions" action={<CardMenuLink href="/admin/analytics" label="Open analytics" />} />
            <div className="border-b border-border-primary p-0 text-text-primary pb-5">
              <div className="w-full rounded-xl bg-card-background" style={{ height: 223 }}>
                <svg
                  viewBox={MAP_VIEW_BOX}
                  width="100%"
                  height="100%"
                  preserveAspectRatio="xMidYMid meet"
                  role="img"
                  aria-label="World map basemap"
                >
                  <g transform={`translate(${MAP_TRANSLATE})`}>
                    {MAP_PATHS.map((d, index) => (
                      <path
                        key={index}
                        d={d}
                        fill="var(--color-background-gray-secondary_alt)"
                        stroke="var(--color-card-border)"
                        strokeWidth={0.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fillRule="evenodd"
                      />
                    ))}
                  </g>
                </svg>
              </div>
            </div>
            <div className="pt-5">
              {regionRows.length === 0 ? (
                <p className="text-sm text-text-tertiary">No regional data yet</p>
              ) : (
                <DemoLegendGroup>
                  {regionRows.map((row) => (
                    <LegendItem key={row.label} color="#5750f1" label={row.label} value={row.countLabel} />
                  ))}
                </DemoLegendGroup>
              )}
            </div>
          </DemoCard>
        </div>

        <DemoCard>
          <TransactionsTable rows={data.transactions} />
        </DemoCard>
      </DemoPageBody>
    </DemoPage>
  );
}
