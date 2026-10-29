import type { TrafficSourcesRawResponse } from "@/nextadmin/services/api/home";

export type { TrafficSourcesRawResponse };

export interface TrafficSourceViewModel {
  name: string;
  value: string;
  percentage: number;
}
