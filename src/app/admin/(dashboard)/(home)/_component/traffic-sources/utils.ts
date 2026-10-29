import type { TrafficSourcesRawResponse } from "@/nextadmin/services/api/home";
import { formatNumber } from "@/nextadmin/utils/format-number";

import type { TrafficSourceViewModel } from "./types";

export function mapTrafficSourcesResponse(
  response: TrafficSourcesRawResponse,
): TrafficSourceViewModel[] {
  return response.sources.map((item) => ({
    name: item.source_name,
    value: formatNumber({ value: item.impression_count }),
    percentage: item.percentage,
  }));
}
