import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://scalmint.com"),
  title: {
    default: "ScalMint — Software, Data & AI for digital transformation",
    template: "%s | ScalMint",
  },
  description:
    "ScalMint builds scalable digital systems that turn business needs into measurable results — web and mobile applications, AI automation, structured data, and model fine-tuning.",
  openGraph: {
    type: "website",
    locale: "en_US",
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
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: "#0A0A0A",
  colorScheme: "dark" as const,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-page font-sans antialiased">{children}</body>
    </html>
  );
}
