import { notFound } from "next/navigation";
import { opsDb as db } from "@/lib/db";
import { ArchivedBanner } from "@/components/ops/PageStates";

export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  let project: { status: string } | null = null;
  try {
    project = await db.project.findUnique({ where: { key } });
  } catch {
    notFound();
  }
  if (!project) notFound();
  return (
    <div className="mt-4 space-y-4">
      {project.status === "ARCHIVED" && <ArchivedBanner />}
      {children}
    </div>
  );
}
