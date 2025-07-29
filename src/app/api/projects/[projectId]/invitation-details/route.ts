import { NextRequest, NextResponse } from "next/server";
import { pgProjectMemberRepository } from "@/lib/db/pg/repositories/project-member-repository.pg";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json("Token is required", { status: 400 });
    }

    const { projectId } = await params;

    // Get invitation details
    const invitation =
      await pgProjectMemberRepository.getInvitationByToken(token);

    if (!invitation) {
      return NextResponse.json("Invalid invitation token", { status: 404 });
    }

    // Check if invitation is for this project
    if (invitation.projectId !== projectId) {
      return NextResponse.json("Invalid invitation", { status: 400 });
    }

    // Check if invitation is expired
    const isExpired = new Date() > new Date(invitation.expiresAt);

    // Get project name
    const project = await pgProjectMemberRepository.getProjectById(
      invitation.projectId,
    );
    if (!project) {
      return NextResponse.json("Project not found", { status: 404 });
    }

    // Get inviter information
    const inviter = await pgProjectMemberRepository.getUserById(
      invitation.invitedBy,
    );
    if (!inviter) {
      return NextResponse.json("Inviter not found", { status: 404 });
    }

    return NextResponse.json({
      id: invitation.id,
      projectName: project.name,
      inviterName: inviter.name || "Unknown",
      inviterEmail: inviter.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      isExpired,
    });
  } catch (error) {
    console.error("Error fetching invitation details:", error);
    return NextResponse.json("Internal server error", { status: 500 });
  }
}
