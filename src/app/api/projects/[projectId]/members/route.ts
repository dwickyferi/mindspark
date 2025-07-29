import { getSession } from "auth/server";
import { pgProjectMemberRepository } from "lib/db/pg/repositories/project-member-repository.pg";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { projectId } = await params;

    // Check if user has access to this project
    const hasAccess = await pgProjectMemberRepository.hasProjectAccess(
      projectId,
      session.user.id,
    );

    if (!hasAccess) {
      return new Response("Forbidden", { status: 403 });
    }

    // Get project members
    const members =
      await pgProjectMemberRepository.getProjectMembers(projectId);

    return Response.json(members);
  } catch (error) {
    console.error("Error fetching project members:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
