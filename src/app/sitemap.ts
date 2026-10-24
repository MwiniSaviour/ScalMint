import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: "https://scalmint.com",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
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
