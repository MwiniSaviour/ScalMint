import type { MetadataRoute } from "next";

const AI_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "Google-Extended",
  "GoogleOther",
  "Google-CloudVertexBot",
  "storebot-google",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  "PerplexityBot",
  "Perplexity-User",
  "Applebot",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "meta-externalagent",
  "FacebookBot",
  "Amazonbot",
  "YouBot",
  "DuckAssistBot",
];

const DISALLOW = ["/affiliate/dashboard", "/affiliate/login", "/api/", "/r/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/llms.txt", "/.well-known/llms.txt"],
        disallow: DISALLOW,
      },
      ...AI_BOTS.map((userAgent) => ({
        userAgent,
        allow: ["/", "/llms.txt", "/.well-known/llms.txt"],
        disallow: DISALLOW,
      })),
    ],
    sitemap: "https://scalmint.com/sitemap.xml",
    host: "https://scalmint.com",
  };
}
