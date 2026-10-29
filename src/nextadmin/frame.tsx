"use client";

import { usePathname } from "next/navigation";
import Shell from "@/nextadmin/shell";

export default function AdminFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path.startsWith("/admin/login")) return <>{children}</>;
  return <Shell>{children}</Shell>;
}
