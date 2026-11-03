export const DEFAULT_AVAILABILITY_SLO = 0.999;

/** Remaining error budget as a ratio. 1 = full budget, 0 = exhausted, negative = burning past SLO. */
export function errorBudgetRemaining(
  availability: number | null,
  slo = DEFAULT_AVAILABILITY_SLO,
): { remaining: number | null; quality: "OK" | "MISSING" } {
  if (availability == null) return { remaining: null, quality: "MISSING" };
  const budget = 1 - slo;
  if (budget <= 0) return { remaining: null, quality: "MISSING" };
  return { remaining: (availability - slo) / budget, quality: "OK" };
}

/** How fast the window consumed the SLO budget. 1 = burning exactly on SLO. */
export function burnRate(availability: number | null, slo = DEFAULT_AVAILABILITY_SLO): number | null {
  if (availability == null) return null;
  const budget = 1 - slo;
  if (budget <= 0) return null;
  return (1 - availability) / budget;
}
