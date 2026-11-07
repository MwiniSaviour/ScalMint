import type { DemoBadgeTone } from "@/components/demo/primitives";
import {
  CardHead,
  DemoBadge,
  DemoCard,
  DemoPage,
  DemoPageBody,
  PageHeader,
} from "@/components/demo/primitives";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from "recharts";

export const dynamic = "force-dynamic";

type SaasSub = {
  id: string;
  name: string;
  email: string;
  status: string;
  mrr: string;
  joined: string;
};

function statusTone(status: string): DemoBadgeTone {
  const s = status.toLowerCase();
  if (s === "active") return "success";
  if (s === "past due") return "warning";
  if (s === "canceled" || s === "expired") return "error";
  if (s === "trialing") return "purple";
  return "neutral";
}

function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function ChartEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-card-border">
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="text-center text-xs leading-4 text-text-tertiary">{body}</p>
    </div>
  );
}

function LineSparkline({ data, height }: { data: { key: string; label: string; value: number }[]; height: string }) {
  const hasData = data.length > 0 && data.some((d) => d.value > 0);
  return (
    <div className={`text-text-primary ${height} w-full p-0`}>
      <div className="flex h-full w-full items-center justify-center px-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-card-border)" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                minTickGap={24}
                tick={{ fill: "var(--color-text-tertiary)", fontSize: 12 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={38}
                allowDecimals={false}
                tick={{ fill: "var(--color-text-tertiary)", fontSize: 12 }}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                name="Revenue"
                stroke="var(--color-brand-500)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty
            title="No revenue data yet"
            body="Revenue will chart here once a SaaS source is connected."
          />
        )}
      </div>
    </div>
  );
}

function RangeSelect() {
  return (
    <select
      defaultValue="monthly"
      className="border border-card-border rounded-lg bg-card-background px-3 py-2 text-sm leading-5 font-medium text-text-primary focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    >
      <option value="monthly">Monthly</option>
      <option value="yearly">Yearly</option>
    </select>
  );
}

function MoreOptions() {
  return (
    <button
      type="button"
      aria-label="More options"
      className="flex items-center justify-center rounded-lg text-sm font-medium transition outline-none focus:ring-4 disabled:pointer-events-none data-[focused=true]:ring-4 [&>svg]:text-current! [&>svg]:size-5 disabled:border disabled:border-button-disabled-border disabled:bg-button-disabled-background disabled:text-button-disabled-text hover:text-button-primary-outline-hover-text focus:ring-button-outline-focus-ring data-[focused=true]:ring-button-outline-focus-ring size-8"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6.00011 12.005L6.00011 11.995M18.0001 12.005V11.995M12.0001 12.005V11.995" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function RevenueOverviewCard({ value, subtitle }: { value: string; subtitle: string | null }) {
  return (
    <DemoCard>
      <div className="relative flex w-full flex-wrap justify-between gap-3 mb-6 items-start">
        <div className="flex flex-col gap-3">
          <span className="text-sm leading-6 font-medium tracking-[-0.2px] text-text-tertiary">Revenue Overview</span>
          <h3 className="text-3xl leading-none font-semibold tracking-[-0.6px] text-text-primary">
            {value || "No data"}
          </h3>
          {subtitle ? <div className="mt-1 text-sm leading-5 tracking-[-0.15px] text-text-tertiary">{subtitle}</div> : null}
        </div>
        <div className="self-start"><RangeSelect /></div>
      </div>
      <LineSparkline data={[]} height="h-42.5" />
    </DemoCard>
  );
}

function CustomerGrowthCard() {
  return (
    <DemoCard className="min-h-47.5">
      <CardHead title="Customer Growth" action={<RangeSelect />} />
      <LineSparkline data={[]} height="h-45" />
    </DemoCard>
  );
}

function RecentSignUpsCard({ subs }: { subs: SaasSub[] }) {
  return (
    <DemoCard>
      <CardHead title="Recent Sign Ups" action={<MoreOptions />} />
      <div className="text-text-primary p-0">
        <div className="w-full overflow-x-auto">
          <div className="min-w-130">
            {subs.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-tertiary">No recent sign ups yet</p>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_120px_96px_96px] gap-4 rounded-lg border-y border-border-primary bg-background-gray-secondary_alt px-4 py-2.5 text-sm leading-5 font-medium tracking-[-0.15px] text-text-tertiary">
                  <div>Rep Name</div>
                  <div className="text-center">Status</div>
                  <div className="text-right">MRR</div>
                  <div className="text-right">Joined</div>
                </div>
                <div className="mt-3.5 space-y-2 px-2 pb-2">
                  {subs.map((sub) => (
                    <div key={sub.id} className="grid grid-cols-[1fr_120px_96px_96px] items-center gap-4 px-2">
                      <div className="flex items-center gap-4">
                        <span className="flex shrink-0 items-center justify-center rounded-full bg-background-gray-secondary_alt text-sm font-semibold text-text-secondary size-12">
                          {avatarInitials(sub.name)}
                        </span>
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="text-sm leading-5 font-medium text-text-primary truncate">{sub.name}</p>
                          <p className="text-xs leading-4 text-text-tertiary truncate">{sub.email}</p>
                        </div>
                      </div>
                      <div className="text-center">{<DemoBadge tone={statusTone(sub.status)}>{sub.status}</DemoBadge>}</div>
                      <div className="text-right text-sm leading-5 font-medium text-text-primary tabular-nums">{sub.mrr}</div>
                      <div className="text-right text-sm leading-5 font-medium text-text-primary">{sub.joined}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DemoCard>
  );
}

export default function Page() {
  return (
    <DemoPage>
      <PageHeader title="SaaS" subtitle="Monitor subscriptions, revenue, customer growth, and product performance." />
      <DemoPageBody>
        <section className="grid grid-cols-1 gap-1 rounded-[14px] bg-background-gray-secondary_alt_2 p-1 xl:grid-cols-[1.4fr_1fr]">
          <RevenueOverviewCard value="No data" subtitle={null} />
          <section className="grid grid-cols-1 gap-1 rounded-[14px] sm:grid-cols-2">
            <CustomerGrowthCard />
            <RecentSignUpsCard subs={[]} />
          </section>
        </section>
      </DemoPageBody>
    </DemoPage>
  );
}
