import { opsDb as db } from "@/lib/db";

export class ScopeError extends Error {
  constructor(
    message: string,
    readonly status = 404,
  ) {
    super(message);
  }
}

export async function projectByKey(key: string) {
  const project = await db.project.findUnique({ where: { key } });
  if (!project) throw new ScopeError("Project not found", 404);
  return project;
}

export function scopedWhere(projectId: string) {
  return { projectId };
}

export function assertSameProject<T extends { projectId: string }>(row: T, projectId: string): T {
  if (row.projectId !== projectId) throw new ScopeError("Cross-project access denied", 403);
  return row;
}

export function envelope<T>(scope: { type: "portfolio"; projectCount: number } | { type: "project"; projectKey: string; projectId: string }, data: T) {
  return { schemaVersion: "1" as const, scope, asOf: new Date().toISOString(), ...data };
}
