import { z } from "zod";

export type ProjectRole = "owner" | "admin" | "member";

export const ProjectRoleSchema = z.enum(["owner", "admin", "member"]);

export type ProjectMember = {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  invitedBy?: string;
  joinedAt: Date;
  createdAt: Date;
  // Joined user info
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
};

export type ProjectInvitation = {
  id: string;
  projectId: string;
  email: string;
  role: Exclude<ProjectRole, "owner">; // Cannot invite as owner
  token: string;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: string;
  createdAt: Date;
  // Joined inviter info
  inviter?: {
    id: string;
    name: string;
    email: string;
  };
};

export type ProjectWithMembers = {
  id: string;
  name: string;
  userId: string; // Owner ID
  instructions?: {
    systemPrompt: string;
  };
  selectedDocuments?: string[];
  createdAt: Date;
  updatedAt: Date;
  members: ProjectMember[];
  pendingInvitations: ProjectInvitation[];
};

// API Request/Response types
export const InviteMemberRequestSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

export type InviteMemberRequest = z.infer<typeof InviteMemberRequestSchema>;

export const ChangeRoleRequestSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "member"]),
});

export type ChangeRoleRequest = z.infer<typeof ChangeRoleRequestSchema>;

export const AcceptInviteRequestSchema = z.object({
  token: z.string(),
});

export type AcceptInviteRequest = z.infer<typeof AcceptInviteRequestSchema>;

// Permission helper types
export type ProjectPermission = "read" | "write" | "admin" | "owner";

export const PROJECT_PERMISSIONS = {
  owner: ["read", "write", "admin", "owner"] as ProjectPermission[],
  admin: ["read", "write", "admin"] as ProjectPermission[],
  member: ["read", "write"] as ProjectPermission[],
} as const;
