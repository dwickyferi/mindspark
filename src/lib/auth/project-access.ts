import { getSession } from "auth/server";
import { pgProjectMemberRepository } from "lib/db/pg/repositories/project-member-repository.pg";
import {
  ProjectRole,
  PROJECT_PERMISSIONS,
  ProjectPermission,
} from "app-types/project-member";

export class ProjectAccessError extends Error {
  constructor(
    message: string,
    public code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND",
  ) {
    super(message);
    this.name = "ProjectAccessError";
  }
}

export interface ProjectAccessContext {
  userId: string;
  projectId: string;
  userRole: ProjectRole | null;
}

/**
 * Verify that the current user has access to a project and return access context
 */
export async function verifyProjectAccess(
  projectId: string,
): Promise<ProjectAccessContext> {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new ProjectAccessError("Authentication required", "UNAUTHORIZED");
  }

  const userRole = await pgProjectMemberRepository.getMemberRole(
    projectId,
    session.user.id,
  );

  if (!userRole) {
    throw new ProjectAccessError(
      "Project not found or access denied",
      "FORBIDDEN",
    );
  }

  return {
    userId: session.user.id,
    projectId,
    userRole,
  };
}

/**
 * Check if a user has a specific permission for a project
 */
export function hasProjectPermission(
  role: ProjectRole,
  permission: ProjectPermission,
): boolean {
  return PROJECT_PERMISSIONS[role].includes(permission);
}

/**
 * Verify that the current user has a specific permission for a project
 */
export async function verifyProjectPermission(
  projectId: string,
  permission: ProjectPermission,
): Promise<ProjectAccessContext> {
  const context = await verifyProjectAccess(projectId);

  if (!hasProjectPermission(context.userRole!, permission)) {
    throw new ProjectAccessError(
      `Insufficient permissions. Required: ${permission}`,
      "FORBIDDEN",
    );
  }

  return context;
}

/**
 * Middleware-style function to handle project access errors
 */
export function handleProjectAccessError(error: unknown): Response {
  if (error instanceof ProjectAccessError) {
    switch (error.code) {
      case "UNAUTHORIZED":
        return new Response(error.message, { status: 401 });
      case "FORBIDDEN":
        return new Response(error.message, { status: 403 });
      case "NOT_FOUND":
        return new Response(error.message, { status: 404 });
    }
  }

  console.error("Unexpected error in project access:", error);
  return new Response("Internal Server Error", { status: 500 });
}

/**
 * Check if current user is project owner (for legacy compatibility)
 */
export async function isProjectOwner(projectId: string): Promise<boolean> {
  try {
    const context = await verifyProjectAccess(projectId);
    return context.userRole === "owner";
  } catch {
    return false;
  }
}

/**
 * Check if current user can manage members (owner or admin)
 */
export async function canManageProjectMembers(
  projectId: string,
): Promise<boolean> {
  try {
    const session = await getSession();
    if (!session?.user?.id) return false;

    return await pgProjectMemberRepository.canManageMembers(
      projectId,
      session.user.id,
    );
  } catch {
    return false;
  }
}
