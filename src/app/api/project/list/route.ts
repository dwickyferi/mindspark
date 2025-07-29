import { getSession } from "auth/server";
import { pgProjectMemberRepository } from "@/lib/db/pg/repositories/project-member-repository.pg";

export async function GET() {
  const session = await getSession();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get all projects the user has access to (as member, admin, or owner)
  const projects = await pgProjectMemberRepository.getUserProjects(
    session.user.id,
  );
  return Response.json(projects);
}
