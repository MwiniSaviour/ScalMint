import type { ReactNode } from "react";
import Link from "next/link";
import {
  CardHead,
  CardMenuDots,
  DemoCard,
  DemoPage,
  DemoPageBody,
  KpiCard,
  KpiGrid,
  PageHeader,
} from "@/components/demo/primitives";
import { KitTabs, ToastAction } from "@/components/demo/interactive";

export const dynamic = "force-dynamic";

function EmptyState({ body }: { body: string }) {
  return (
    <div className="flex h-64 w-full flex-col items-center justify-center text-center">
      <p className="text-sm leading-5 font-medium text-text-secondary">No data yet</p>
      <p className="mt-1 text-sm leading-5 text-text-tertiary">{body}</p>
    </div>
  );
}

function TableEmptyState(): ReactNode {
  return (
    <tr>
      <td colSpan={6} className="px-6 py-8 text-center text-sm text-text-tertiary">
        No data yet
      </td>
    </tr>
  );
}

function WatchlistEmpty(): ReactNode {
  return (
    <div className="flex h-[180px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-card-border">
      <p className="text-sm font-medium text-text-primary">Your watchlist is empty</p>
      <p className="text-xs leading-4 text-text-tertiary text-center">
        Add instruments to track their prices here.
      </p>
    </div>
  );
}

function ExchangeStockEmpty(): ReactNode {
  return (
    <div className="flex h-[180px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-card-border">
      <p className="text-sm font-medium text-text-primary">No exchange data</p>
      <p className="text-xs leading-4 text-text-tertiary text-center">
        Gainers and losers will appear here once market data is connected.
      </p>
    </div>
  );
}

function NewsEmpty(): ReactNode {
  return (
    <div className="flex h-[180px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-card-border">
      <p className="text-sm font-medium text-text-primary">No market news yet</p>
      <p className="text-xs leading-4 text-text-tertiary text-center">
        Market news will appear here once a news source is connected.
      </p>
    </div>
  );
}

export default function Page() {
  return (
    <DemoPage>
      <PageHeader
        title="Stocks"
        subtitle="Monitor portfolio performance and market activity effortlessly."
      />
      <DemoPageBody>
        <KpiGrid>
          <KpiCard label="Portfolio Value" value="No data" />
          <KpiCard label="Today's Return" value="No data" />
          <KpiCard label="Watchlisted" value="No data" />
          <KpiCard label="Open Positions" value="No data" />
        </KpiGrid>

        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <DemoCard className="min-w-0">
            <CardHead title="Portfolio Performance" />
            <div className="text-text-primary p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <KitTabs ariaLabel="Portfolio time range" labels={["1 W", "1 M", "3 M", "1 Y", "All"]} defaultValue="1 M" />
              </div>
              <div className="h-67.5 w-full px-6">
                <EmptyState body="Portfolio performance will chart here once a market data source is connected." />
              </div>
            </div>
          </DemoCard>

          <DemoCard className="min-w-0">
            <div className="relative flex w-full flex-wrap items-center justify-between gap-3 mb-6">
              <h3 className="leading-6 font-semibold tracking-[-0.2px] text-text-primary">My Watchlist</h3>
              <ToastAction
                ariaLabel="Watchlist settings"
                message="Watchlist settings become available once a market data source is connected."
                className="rounded-lg bg-button-primary-outline-background p-1.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2 hover:bg-button-primary-outline-hover-background [&>svg]:size-5 [&>svg]:text-current!"
              >
                <CardMenuDots />
              </ToastAction>
            </div>
            <div className="text-text-primary p-0">
              <WatchlistEmpty />
            </div>
            <div className="mt-6 p-0">
              <ToastAction
                ariaLabel="Add to watchlist"
                message="Can’t add instruments yet — connect a market data source first."
                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-card-border bg-card-background px-4 py-2 text-sm font-medium text-text-primary hover:bg-background-gray-secondary_alt w-full outline-none focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2"
              >
                Add Watchlist
              </ToastAction>
            </div>
          </DemoCard>
        </div>

        <div className="grid gap-5 lg:grid-cols-[362px_1fr]">
          <DemoCard className="min-w-0">
            <div className="relative flex w-full flex-wrap items-center justify-between gap-3 mb-6">
              <h3 className="leading-6 font-semibold tracking-[-0.2px] text-text-primary">Exchange stock</h3>
              <ToastAction
                ariaLabel="Exchange settings"
                message="Exchange settings become available once a market data source is connected."
                className="rounded-lg bg-button-primary-outline-background p-1.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2 hover:bg-button-primary-outline-hover-background [&>svg]:size-5 [&>svg]:text-current!"
              >
                <CardMenuDots />
              </ToastAction>
            </div>
            <div className="text-text-primary p-0">
              <div className="mb-6 flex items-center gap-1 rounded-lg border-none bg-tab-background p-1">
                <KitTabs
                  ariaLabel="Exchange stock view"
                  labels={["Trading", "Gainer", "Loser"]}
                  defaultValue="Trading"
                />
              </div>
              <div className="mt-6 space-y-5">
                <ExchangeStockEmpty />
              </div>
              <div className="mt-3 flex gap-3 w-full">
                <ToastAction
                  disabled
                  disabledTitle="Trading is disabled until a market data source is connected"
                  message="Not applicable"
                  className="flex items-center justify-center rounded-lg border border-card-border bg-card-background px-3 py-1 text-sm font-medium text-text-primary cursor-not-allowed flex-1 outline-none disabled:opacity-60 disabled:text-text-tertiary"
                >
                  Short
                </ToastAction>
                <ToastAction
                  disabled
                  disabledTitle="Trading is disabled until a market data source is connected"
                  message="Not applicable"
                  className="flex items-center justify-center rounded-lg border border-card-border bg-card-background px-3 py-1 text-sm font-medium text-text-primary cursor-not-allowed flex-1 outline-none disabled:opacity-60 disabled:text-text-tertiary"
                >
                  Buy
                </ToastAction>
              </div>
            </div>
          </DemoCard>

          <DemoCard className="min-w-0">
            <div className="relative flex w-full flex-wrap items-center justify-between gap-3 mb-6">
              <h3 className="leading-6 font-semibold tracking-[-0.2px] text-text-primary">Market Overview</h3>
              <ToastAction
                ariaLabel="View all market overview symbols"
                message="No market data source is connected yet — the full market overview will open once it is."
                className="flex items-center justify-center rounded-lg text-sm font-medium transition outline-none focus:ring-4 [&>svg]:text-current! [&>svg]:size-5 border border-card-border px-3.5 py-2 h-9.5 hover:text-text-primary min-h-9"
              >
                View All
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  className="ml-1.5 size-4"
                >
                  <path d="M5 15L15 5M15 12.5V5H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </ToastAction>
            </div>
            <div className="text-text-primary p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 overflow-clip border border-border-primary text-left rounded-none border-none">
                  <caption className="sr-only">Market overview symbols, quantity, price, volume, 24H change and market cap</caption>
                  <thead className="[&_th]:border-b [&_th]:border-border-primary [&_th]:text-xs">
                    <tr className="not-last:[&_th]:border-b [&_th]:border-t">
                      <th className="font-medium px-5 py-2.5 text-xs leading-4 text-text-secondary">Symbol</th>
                      <th className="font-medium px-5 py-2.5 text-xs leading-4 text-text-secondary">Quantity</th>
                      <th className="font-medium px-5 py-2.5 text-xs leading-4 text-text-secondary">Price</th>
                      <th className="font-medium px-5 py-2.5 text-xs leading-4 text-text-secondary">Volume</th>
                      <th className="font-medium px-5 py-2.5 text-xs leading-4 text-text-secondary">24H%</th>
                      <th className="font-medium px-5 py-2.5 text-xs leading-4 text-text-secondary">Market Cap</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableEmptyState />
                  </tbody>
                </table>
              </div>
            </div>
          </DemoCard>
        </div>

        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <DemoCard className="min-w-0">
            <div className="relative flex w-full flex-wrap items-center justify-between gap-3 mb-6">
              <h3 className="leading-6 font-semibold tracking-[-0.2px] text-text-primary">Last Transaction</h3>
              <Link
                href="/admin/conversions"
                aria-label="View all transactions in conversions"
                className="flex items-center justify-center rounded-lg text-sm font-medium transition outline-none focus:ring-4 [&>svg]:text-current! [&>svg]:size-5 border border-card-border px-3.5 py-2 h-9.5 hover:text-text-primary min-h-9"
              >
                View All
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  className="ml-1.5 size-4"
                >
                  <path d="M5 15L15 5M15 12.5V5H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
            <div className="text-text-primary p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 overflow-clip border border-border-primary text-left rounded-none border-none">
                  <caption className="sr-only">Last transactions type, symbol, quantity, price, total and time</caption>
                  <thead className="[&_th]:border-b [&_th]:border-border-primary [&_th]:text-xs">
                    <tr className="not-last:[&_th]:border-b [&_th]:border-t">
                      <th className="font-medium px-4 py-2.5 text-text-secondary">Type</th>
                      <th className="font-medium px-4 py-2.5 text-text-secondary">Symbol</th>
                      <th className="font-medium px-4 py-2.5 text-text-secondary">Quantity</th>
                      <th className="font-medium px-4 py-2.5 text-text-secondary">Price</th>
                      <th className="font-medium px-4 py-2.5 text-text-secondary">Total</th>
                      <th className="font-medium px-4 py-2.5 text-text-secondary">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableEmptyState />
                  </tbody>
                </table>
              </div>
            </div>
          </DemoCard>

          <DemoCard className="min-w-0">
            <div className="relative flex w-full flex-wrap items-center justify-between gap-3 mb-6">
              <h3 className="leading-6 font-semibold tracking-[-0.2px] text-text-primary">Market New</h3>
              <ToastAction
                ariaLabel="View all market news"
                message="No news source is connected yet — market news will open once it is."
                className="flex items-center justify-center rounded-lg text-sm font-medium transition outline-none focus:ring-4 [&>svg]:text-current! [&>svg]:size-5 border border-card-border px-3.5 py-2 h-9.5 hover:text-text-primary min-h-9"
              >
                View All
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  className="ml-1.5 size-4"
                >
                  <path d="M5 15L15 5M15 12.5V5H7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </ToastAction>
            </div>
            <div className="text-text-primary p-0">
              <NewsEmpty />
            </div>
          </DemoCard>
        </div>
      </DemoPageBody>
    </DemoPage>
  );
}
