import type { Metadata } from "next";
import "./globals.css";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";

export const metadata: Metadata = {
  metadataBase: new URL("https://scalmint.com"),
  title: {
    default: "ScalMint — Software, Data & AI for digital transformation",
    template: "%s | ScalMint",
  },
  description:
    "ScalMint builds scalable digital systems that turn business needs into measurable results — web and mobile applications, AI automation, structured data, and model fine-tuning.",
  keywords: [
    "ScalMint",
    "digital transformation",
    "software development Ghana",
    "AI automation",
    "web applications",
    "mobile applications",
    "model fine-tuning",
    "Nova POS",
    "Operasch",
  ],
  authors: [{ name: "ScalMint", url: "https://scalmint.com" }],
  creator: "ScalMint",
  publisher: "ScalMint",
  category: "technology",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://scalmint.com",
    siteName: "ScalMint",
    title: "ScalMint — Software, Data & AI for digital transformation",
    description:
      "Scalable web, mobile and desktop applications, AI automation, structured data and model fine-tuning. Digital transformation is a responsibility of every modern business.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScalMint — Software, Data & AI for digital transformation",
    description: "Scalable digital systems that turn business needs into measurable results.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: "Wz9cgkhl9ruV4ocgFkqh7Pgxr-y-C5gPsVc_KcxXf_U",
  },
  icons: {
    icon: [{ url: "/brand/mark.png", type: "image/png" }],
    shortcut: "/brand/mark.png",
    apple: "/brand/mark.png",
  },
};

export const viewport = {
  themeColor: "#F6F6F4",
  colorScheme: "light" as const,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="light">
      <body className="bg-page font-sans antialiased text-body">
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
