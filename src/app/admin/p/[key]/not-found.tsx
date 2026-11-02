import Link from "next/link";
import ProjectSwitcher from "@/components/ops/ProjectSwitcher";

export default function ProjectNotFound() {
  return (
    <div className="mt-16 px-6 text-center">
      <h1 className="text-[28px] font-medium text-text-primary">Project not found</h1>
      <p className="mt-2 text-sm text-text-tertiary">
        That key is not in the registry. Use the switcher — we will not silently send you to the portfolio.
      </p>
      <div className="mx-auto mt-6 max-w-sm">
        <ProjectSwitcher />
      </div>
      <Link href="/admin/projects" className="mt-6 inline-block text-sm underline">
        Manage projects
      </Link>
    </div>
  );
}
