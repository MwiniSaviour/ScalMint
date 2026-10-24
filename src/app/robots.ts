import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/affiliate/dashboard",
          "/affiliate/login",
          "/api/",
          "/r/",
        ],
      },
    ],
    sitemap: "https://scalmint.com/sitemap.xml",
    host: "https://scalmint.com",
  };
}
