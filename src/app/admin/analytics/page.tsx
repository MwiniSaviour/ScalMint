import type { ReactNode } from "react";
import {
  CardHead,
  DemoCard,
  DemoPage,
  DemoPageBody,
  DemoTableHeader,
  PageHeader,
} from "@/components/demo/primitives";

export const dynamic = "force-dynamic";

const KPI_LABELS = [
  "Unique Visitors",
  "Total Pageviews",
  "Bounce Rate",
  "Visit Duration",
] as const;

function EmptyState({ body }: { body: string }) {
  return (
    <div className="flex h-64.5 w-full flex-col items-center justify-center text-center">
      <p className="text-sm leading-5 font-medium text-text-secondary">No data yet</p>
      <p className="mt-1 text-sm leading-5 text-text-tertiary">{body}</p>
    </div>
  );
}

function TableEmptyState(): ReactNode {
  return (
    <div className="flex h-40 items-center justify-center">
      <p className="text-sm leading-5 text-text-tertiary">No data yet</p>
    </div>
  );
}

export default function Page() {
  return (
    <DemoPage>
      <PageHeader
        title="Analytics"
        subtitle="Analyze trends, track growth, and make data-driven decisions."
        action={
          <p className="text-sm leading-5 text-text-tertiary">Analytics not collected yet</p>
        }
      />
      <DemoPageBody>
        <div className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5">
          <div className="grid grid-cols-1 justify-between gap-6 divide-border-primary sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-y-0">
            {KPI_LABELS.map((label) => (
              <div key={label} className="first:pl-0 last:pr-0 lg:px-6">
                <p className="text-sm font-medium text-text-secondary">{label}</p>
                <div className="mt-2 flex items-center justify-between lg:mt-4">
                  <h2 className="text-xl font-semibold text-text-primary md:text-2xl md:leading-8">
                    No data
                  </h2>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[7fr_4fr]">
          <DemoCard>
            <CardHead title="Visitors Analytics" />
            <EmptyState body="ScalMint doesn't collect visitor metrics yet." />
          </DemoCard>
          <DemoCard>
            <CardHead title="Used Devices" />
            <EmptyState body="ScalMint doesn't collect device metrics yet." />
          </DemoCard>
        </div>

        <div className="grid gap-5 lg:grid-cols-[6fr_5fr]">
          <DemoCard className="flex flex-col">
            <CardHead title="Top Countries" />
            <EmptyState body="ScalMint doesn't collect geography metrics yet." />
          </DemoCard>
          <div className="space-y-5">
            <DemoCard>
              <CardHead title="Top Content" />
              <DemoTableHeader cols="1fr_100px_96px">
                <span>URL</span>
                <span>Views</span>
                <span>Uniques</span>
              </DemoTableHeader>
              <TableEmptyState />
            </DemoCard>
            <DemoCard>
              <CardHead title="Top Channels" />
              <DemoTableHeader cols="1fr_100px_96px">
                <span>Channel</span>
                <span>Views</span>
                <span>Uniques</span>
              </DemoTableHeader>
              <TableEmptyState />
            </DemoCard>
          </div>
        </div>
      </DemoPageBody>
    </DemoPage>
  );
}
