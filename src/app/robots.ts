import type { MetadataRoute } from "next";

const AI_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "Google-Extended",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/affiliate/dashboard", "/affiliate/login", "/api/", "/r/"],
      },
      ...AI_BOTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: ["/affiliate/dashboard", "/affiliate/login", "/api/", "/r/"],
      })),
    ],
    sitemap: "https://scalmint.com/sitemap.xml",
    host: "https://scalmint.com",
  };
}
