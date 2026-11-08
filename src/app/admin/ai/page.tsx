import type { ReactNode } from "react";
import {
  AgentSmileyIcon,
  CardHead,
  DemoCard,
  DemoPage,
  DemoPageBody,
  DemoTableHeader,
  KpiCard,
  KpiGrid,
  PageHeader,
} from "@/components/demo/primitives";
import { Link } from "lucide-react";

export const dynamic = "force-dynamic";

function TintedIcon({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div className={`flex size-8 items-center justify-center rounded-lg ${className}`}>
      {children}
    </div>
  );
}

function EmptyState({ body }: { body: string }) {
  return (
    <div className="flex h-64.5 w-full flex-col items-center justify-center text-center">
      <p className="text-sm leading-5 font-medium text-text-secondary">No data yet</p>
      <p className="mt-1 text-sm leading-5 text-text-tertiary">{body}</p>
    </div>
  );
}

function TableEmptyState({ body }: { body: string }) {
  return (
    <div className="flex h-40 items-center justify-center">
      <p className="text-sm leading-5 text-text-tertiary">{body}</p>
    </div>
  );
}

export default function AIPage() {
  return (
    <DemoPage>
      <PageHeader
        title="AI"
        subtitle="Manage AI agents, monitor usage, track costs, and optimize workflows."
      />
      <DemoPageBody>
        <KpiGrid>
          <KpiCard
            label="Active Agents"
            value="No data"
            icon={
              <TintedIcon className="bg-[rgba(59,130,246,0.10)] text-blue-700">
                <AgentSmileyIcon />
              </TintedIcon>
            }
          />
          <KpiCard
            label="API Request"
            value="No data"
            icon={
              <TintedIcon className="bg-[rgba(16,185,129,0.10)] text-emerald-700">
                <Link size={18} strokeWidth={1.5} />
              </TintedIcon>
            }
          />
        </KpiGrid>

        <div className="grid gap-5 lg:grid-cols-[1fr_min(458px,100%)]">
          <DemoCard className="lg:col-span-2">
            <CardHead title="Usage by Provider" />
            <EmptyState body="ScalMint doesn't track AI provider usage yet." />
          </DemoCard>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_min(500px,40%)]">
          <DemoCard className="lg:col-span-2">
            <CardHead title="AI Agents" />
            <DemoTableHeader cols="1fr_120px_96px_96px">
              <span>Agent</span>
              <span>Requests</span>
              <span>Cost</span>
              <span>Status</span>
            </DemoTableHeader>
            <TableEmptyState body="No AI agents yet" />
          </DemoCard>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_min(550px,50%)]">
          <DemoCard className="lg:col-span-2">
            <CardHead title="Top Usage" />
            <DemoTableHeader cols="1fr_100px_96px">
              <span>Agent</span>
              <span>Requests</span>
              <span>Cost</span>
            </DemoTableHeader>
            <TableEmptyState body="No usage data yet" />
          </DemoCard>
        </div>
      </DemoPageBody>
    </DemoPage>
  );
}
