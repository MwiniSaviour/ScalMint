"use client";

import { useEffect } from "react";
import { dashboardUrl, readAffiliateToken } from "@/lib/auth/client";

/** If the cookie was dropped (iframe / Secure mismatch) but Apply/Sign-in
 *  stored a JWT, bounce to the dashboard with `?s=`. */
export function DashboardSessionRescue() {
  useEffect(() => {
    const token = readAffiliateToken();
    if (!token) return;
    const next = dashboardUrl(token);
    if (window.location.search.includes("s=")) return;
    window.location.replace(next);
  }, []);
  return null;
}
