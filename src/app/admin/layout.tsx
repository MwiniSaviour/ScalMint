import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import Providers from "@/nextadmin/providers";
import AdminFrame from "@/nextadmin/frame";
import "@/nextadmin/globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | ScalMint Ops",
    default: "ScalMint Ops — Affiliate programme",
  },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[100dvh] overflow-hidden bg-[#f3f4f6] text-[#111827]">
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <Providers>
          <AdminFrame>{children}</AdminFrame>
        </Providers>
      </ThemeProvider>
      <Toaster />
    </div>
  );
}
