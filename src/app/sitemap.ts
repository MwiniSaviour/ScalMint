import type { MetadataRoute } from "next";
import { SERVICES } from "@/lib/marketing/pages";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const site = "https://scalmint.com";
  const marketing = [
    "",
    "/services",
    ...SERVICES.map((s) => `/services/${s.slug}`),
    "/pricing",
    "/enterprise",
    "/industries",
    "/insights",
    "/journal",
    "/changelog",
    "/community",
    "/events",
    "/help",
    "/academy",
    "/careers",
    "/resources",
    "/contact",
    "/legal/privacy",
    "/legal/terms",
  ];
  return [
    ...marketing.map((path, i) => ({
      url: `${site}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: i === 0 ? 1 : 0.6,
    })),
    {
      url: "https://affiliate.scalmint.com",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://affiliate.scalmint.com/apply",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
