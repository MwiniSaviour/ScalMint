import type { MetadataRoute } from "next";

const SITE = "https://scalmint.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE}/affiliate`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE}/affiliate/apply`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
