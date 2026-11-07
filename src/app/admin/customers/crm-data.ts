import { opsFetch } from "@/lib/ops/client-fetch";

export const CRM_ENDPOINT = "/api/admin/crm";

export type CrmKpi = {
  label: string;
  value: string;
  delta: string | null;
  deltaTone: "up" | "down" | "flat";
};

export type CrmChartDay = {
  key: string;
  label: string;
  leads: number;
  conversions: number;
};

export type CrmLeadRow = {
  id: string;
  rep: string;
  role: string;
  dealsClosed: number;
  revenue: string;
  performance: number;
  performanceLabel: string;
};

export type CrmActivity = {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
};

export type CrmData = {
  kpis: CrmKpi[];
  chart: CrmChartDay[];
  leads: CrmLeadRow[];
  activities: CrmActivity[];
};

export const emptyCrmData: CrmData = {
  kpis: [],
  chart: [],
  leads: [],
  activities: [],
};

export async function loadCrm(): Promise<CrmData> {
  const res = await opsFetch<CrmData>(CRM_ENDPOINT);
  if (!res.ok) {
    throw new Error(res.error ?? `CRM load failed (HTTP ${res.status})`);
  }
  return res.data ?? emptyCrmData;
}
