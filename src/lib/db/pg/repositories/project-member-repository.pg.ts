import { eq, and, desc, isNull, ne } from "drizzle-orm";
import { pgDb as db } from "../db.pg";
import {
  ProjectMemberSchema,
  ProjectInvitationSchema,
  ProjectSchema,
  UserSchema,
} from "../schema.pg";
import {
  ProjectMember,
  ProjectInvitation,
  ProjectRole,
  ProjectWithMembers,
} from "app-types/project-member";
import { generateUUID } from "lib/utils";
import { addDays } from "date-fns";

export interface ProjectMemberRepository {
  // Member management
  getProjectMembers(projectId: string): Promise<ProjectMember[]>;
  addProjectMember(
    projectId: string,
    userId: string,
    role: ProjectRole,
    invitedBy?: string,
  ): Promise<ProjectMember>;
  updateMemberRole(
    projectId: string,
    userId: string,
    role: ProjectRole,
  ): Promise<ProjectMember>;
  removeMember(projectId: string, userId: string): Promise<void>;
  getMemberRole(projectId: string, userId: string): Promise<ProjectRole | null>;

  // Invitation management
  createInvitation(
    projectId: string,
    email: string,
    role: Exclude<ProjectRole, "owner">,
    invitedBy: string,
    expiresAt?: Date,
  ): Promise<ProjectInvitation>;
  getInvitationByToken(token: string): Promise<ProjectInvitation | null>;
  getPendingInvitations(projectId: string): Promise<ProjectInvitation[]>;
  acceptInvitation(token: string, userId: string): Promise<ProjectMember>;
  revokeInvitation(invitationId: string): Promise<void>;

  // Project access
  getProjectWithMembers(projectId: string): Promise<ProjectWithMembers | null>;
  getUserProjects(userId: string): Promise<ProjectWithMembers[]>;
  hasProjectAccess(projectId: string, userId: string): Promise<boolean>;
  canManageMembers(projectId: string, userId: string): Promise<boolean>;

  // Helper methods
  getProjectById(
    projectId: string,
  ): Promise<{ id: string; name: string } | null>;
  getUserById(
    userId: string,
  ): Promise<{ id: string; name: string | null; email: string } | null>;
}

export const pgProjectMemberRepository: ProjectMemberRepository = {
  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const result = await db
      .select({
        id: ProjectMemberSchema.id,
        projectId: ProjectMemberSchema.projectId,
        userId: ProjectMemberSchema.userId,
        role: ProjectMemberSchema.role,
        invitedBy: ProjectMemberSchema.invitedBy,
        joinedAt: ProjectMemberSchema.joinedAt,
        createdAt: ProjectMemberSchema.createdAt,
        user: {
          id: UserSchema.id,
          name: UserSchema.name,
          email: UserSchema.email,
          image: UserSchema.image,
        },
      })
      .from(ProjectMemberSchema)
      .leftJoin(UserSchema, eq(ProjectMemberSchema.userId, UserSchema.id))
      .where(eq(ProjectMemberSchema.projectId, projectId))
      .orderBy(desc(ProjectMemberSchema.joinedAt));

    return result.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      userId: row.userId,
      role: row.role as ProjectRole,
      invitedBy: row.invitedBy || undefined,
      joinedAt: row.joinedAt,
      createdAt: row.createdAt,
      user: row.user
        ? {
            id: row.user.id,
            name: row.user.name,
            email: row.user.email,
            image: row.user.image || undefined,
          }
        : undefined,
    }));
  },

  async addProjectMember(
    projectId: string,
    userId: string,
    role: ProjectRole,
    invitedBy?: string,
  ): Promise<ProjectMember> {
    const [result] = await db
      .insert(ProjectMemberSchema)
      .values({
        projectId,
        userId,
        role,
        invitedBy,
        joinedAt: new Date(),
        createdAt: new Date(),
      })
      .returning();

    // Get user info
    const [user] = await db
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.id, userId));

    return {
      id: result.id,
      projectId: result.projectId,
      userId: result.userId,
      role: result.role as ProjectRole,
      invitedBy: result.invitedBy || undefined,
      joinedAt: result.joinedAt,
      createdAt: result.createdAt,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image || undefined,
          }
        : undefined,
    };
  },

  async updateMemberRole(
    projectId: string,
    userId: string,
    role: ProjectRole,
  ): Promise<ProjectMember> {
    const [result] = await db
      .update(ProjectMemberSchema)
      .set({ role })
      .where(
        and(
          eq(ProjectMemberSchema.projectId, projectId),
          eq(ProjectMemberSchema.userId, userId),
        ),
      )
      .returning();

    // Get user info
    const [user] = await db
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.id, userId));

    return {
      id: result.id,
      projectId: result.projectId,
      userId: result.userId,
      role: result.role as ProjectRole,
      invitedBy: result.invitedBy || undefined,
      joinedAt: result.joinedAt,
      createdAt: result.createdAt,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image || undefined,
          }
        : undefined,
    };
  },

  async removeMember(projectId: string, userId: string): Promise<void> {
    await db.delete(ProjectMemberSchema).where(
      and(
        eq(ProjectMemberSchema.projectId, projectId),
        eq(ProjectMemberSchema.userId, userId),
        // Cannot remove owner
        ne(ProjectMemberSchema.role, "owner"),
      ),
    );
  },

  async getMemberRole(
    projectId: string,
    userId: string,
  ): Promise<ProjectRole | null> {
    const [result] = await db
      .select({ role: ProjectMemberSchema.role })
      .from(ProjectMemberSchema)
      .where(
        and(
          eq(ProjectMemberSchema.projectId, projectId),
          eq(ProjectMemberSchema.userId, userId),
        ),
      );

    return result ? (result.role as ProjectRole) : null;
  },

  async createInvitation(
    projectId: string,
    email: string,
    role: Exclude<ProjectRole, "owner">,
    invitedBy: string,
    expiresAt = addDays(new Date(), 7), // Default 7 days expiry
  ): Promise<ProjectInvitation> {
    const token = generateUUID();

    const [result] = await db
      .insert(ProjectInvitationSchema)
      .values({
        projectId,
        email,
        role,
        token,
        invitedBy,
        expiresAt,
        createdAt: new Date(),
      })
      .returning();

    // Get inviter info
    const [inviter] = await db
      .select()
      .from(UserSchema)
      .where(eq(UserSchema.id, invitedBy));

    return {
      id: result.id,
      projectId: result.projectId,
      email: result.email,
      role: result.role as Exclude<ProjectRole, "owner">,
      token: result.token,
      invitedBy: result.invitedBy,
      expiresAt: result.expiresAt,
      acceptedAt: result.acceptedAt || undefined,
      acceptedBy: result.acceptedBy || undefined,
      createdAt: result.createdAt,
      inviter: inviter
        ? {
            id: inviter.id,
            name: inviter.name,
            email: inviter.email,
          }
        : undefined,
    };
  },

  async getInvitationByToken(token: string): Promise<ProjectInvitation | null> {
    const [result] = await db
      .select({
        id: ProjectInvitationSchema.id,
        projectId: ProjectInvitationSchema.projectId,
        email: ProjectInvitationSchema.email,
        role: ProjectInvitationSchema.role,
        token: ProjectInvitationSchema.token,
        invitedBy: ProjectInvitationSchema.invitedBy,
        expiresAt: ProjectInvitationSchema.expiresAt,
        acceptedAt: ProjectInvitationSchema.acceptedAt,
        acceptedBy: ProjectInvitationSchema.acceptedBy,
        createdAt: ProjectInvitationSchema.createdAt,
        inviter: {
          id: UserSchema.id,
          name: UserSchema.name,
          email: UserSchema.email,
        },
      })
      .from(ProjectInvitationSchema)
      .leftJoin(
        UserSchema,
        eq(ProjectInvitationSchema.invitedBy, UserSchema.id),
      )
      .where(eq(ProjectInvitationSchema.token, token));

    if (!result) return null;

    return {
      id: result.id,
      projectId: result.projectId,
      email: result.email,
      role: result.role as Exclude<ProjectRole, "owner">,
      token: result.token,
      invitedBy: result.invitedBy,
      expiresAt: result.expiresAt,
      acceptedAt: result.acceptedAt || undefined,
      acceptedBy: result.acceptedBy || undefined,
      createdAt: result.createdAt,
      inviter: result.inviter
        ? {
            id: result.inviter.id,
            name: result.inviter.name,
            email: result.inviter.email,
          }
        : undefined,
    };
  },

  async getPendingInvitations(projectId: string): Promise<ProjectInvitation[]> {
    const result = await db
      .select({
        id: ProjectInvitationSchema.id,
        projectId: ProjectInvitationSchema.projectId,
        email: ProjectInvitationSchema.email,
        role: ProjectInvitationSchema.role,
        token: ProjectInvitationSchema.token,
        invitedBy: ProjectInvitationSchema.invitedBy,
        expiresAt: ProjectInvitationSchema.expiresAt,
        acceptedAt: ProjectInvitationSchema.acceptedAt,
        acceptedBy: ProjectInvitationSchema.acceptedBy,
        createdAt: ProjectInvitationSchema.createdAt,
        inviter: {
          id: UserSchema.id,
          name: UserSchema.name,
          email: UserSchema.email,
        },
      })
      .from(ProjectInvitationSchema)
      .leftJoin(
        UserSchema,
        eq(ProjectInvitationSchema.invitedBy, UserSchema.id),
      )
      .where(
        and(
          eq(ProjectInvitationSchema.projectId, projectId),
          isNull(ProjectInvitationSchema.acceptedAt),
        ),
      )
      .orderBy(desc(ProjectInvitationSchema.createdAt));

    return result.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      email: row.email,
      role: row.role as Exclude<ProjectRole, "owner">,
      token: row.token,
      invitedBy: row.invitedBy,
      expiresAt: row.expiresAt,
      acceptedAt: row.acceptedAt || undefined,
      acceptedBy: row.acceptedBy || undefined,
      createdAt: row.createdAt,
      inviter: row.inviter
        ? {
            id: row.inviter.id,
            name: row.inviter.name,
            email: row.inviter.email,
          }
        : undefined,
    }));
  },

  async acceptInvitation(
    token: string,
    userId: string,
  ): Promise<ProjectMember> {
    // Get invitation
    const invitation = await this.getInvitationByToken(token);
    if (!invitation || invitation.acceptedAt) {
      throw new Error("Invalid or already accepted invitation");
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error("Invitation has expired");
    }

    // Create member
    const member = await this.addProjectMember(
      invitation.projectId,
      userId,
      invitation.role,
      invitation.invitedBy,
    );

    // Mark invitation as accepted
    await db
      .update(ProjectInvitationSchema)
      .set({
        acceptedAt: new Date(),
        acceptedBy: userId,
      })
      .where(eq(ProjectInvitationSchema.token, token));

    return member;
  },

  async revokeInvitation(invitationId: string): Promise<void> {
    await db
      .delete(ProjectInvitationSchema)
      .where(eq(ProjectInvitationSchema.id, invitationId));
  },

  async getProjectWithMembers(
    projectId: string,
  ): Promise<ProjectWithMembers | null> {
    // Get project
    const [project] = await db
      .select()
      .from(ProjectSchema)
      .where(eq(ProjectSchema.id, projectId));

    if (!project) return null;

    // Get members
    const members = await this.getProjectMembers(projectId);

    // Get pending invitations
    const pendingInvitations = await this.getPendingInvitations(projectId);

    return {
      id: project.id,
      name: project.name,
      userId: project.userId,
      instructions: project.instructions || undefined,
      selectedDocuments: project.selectedDocuments || undefined,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      members,
      pendingInvitations,
    };
  },

  async getUserProjects(userId: string): Promise<ProjectWithMembers[]> {
    // Get all projects where user is a member
    const projectIds = await db
      .select({ projectId: ProjectMemberSchema.projectId })
      .from(ProjectMemberSchema)
      .where(eq(ProjectMemberSchema.userId, userId));

    const projects: ProjectWithMembers[] = [];

    for (const { projectId } of projectIds) {
      const project = await this.getProjectWithMembers(projectId);
      if (project) {
        projects.push(project);
      }
    }

    return projects;
  },

  async hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const [result] = await db
      .select({ id: ProjectMemberSchema.id })
      .from(ProjectMemberSchema)
      .where(
        and(
          eq(ProjectMemberSchema.projectId, projectId),
          eq(ProjectMemberSchema.userId, userId),
        ),
      );

    return !!result;
  },

  async canManageMembers(projectId: string, userId: string): Promise<boolean> {
    const role = await this.getMemberRole(projectId, userId);
    return role === "owner" || role === "admin";
  },

  // Helper methods
  async getProjectById(
    projectId: string,
  ): Promise<{ id: string; name: string } | null> {
    const result = await db
      .select({
        id: ProjectSchema.id,
        name: ProjectSchema.name,
      })
      .from(ProjectSchema)
      .where(eq(ProjectSchema.id, projectId))
      .limit(1);

    return result[0] || null;
  },

  async getUserById(
    userId: string,
  ): Promise<{ id: string; name: string | null; email: string } | null> {
    const result = await db
      .select({
        id: UserSchema.id,
        name: UserSchema.name,
        email: UserSchema.email,
      })
      .from(UserSchema)
      .where(eq(UserSchema.id, userId))
      .limit(1);

    return result[0] || null;
  },
};
