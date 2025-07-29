import { pgDb as db } from "lib/db/pg/db.pg";
import { ProjectSchema, ProjectMemberSchema } from "lib/db/pg/schema.pg";
import { pgProjectMemberRepository } from "lib/db/pg/repositories/project-member-repository.pg";
import { eq, notInArray } from "drizzle-orm";

/**
 * Migration script to add existing project creators as owner members
 * This fixes the issue where projects created before the member system
 * don't appear in the sidebar or allow member management
 */
async function migrateExistingProjects() {
  console.log(
    "🔄 Starting migration: Adding project creators as owner members...",
  );

  try {
    // Get all projects that don't have their creator as a member
    const projectsWithoutCreatorMember = await db
      .select({
        id: ProjectSchema.id,
        userId: ProjectSchema.userId,
        name: ProjectSchema.name,
      })
      .from(ProjectSchema)
      .where(
        notInArray(
          ProjectSchema.id,
          db
            .select({ projectId: ProjectMemberSchema.projectId })
            .from(ProjectMemberSchema)
            .where(eq(ProjectMemberSchema.userId, ProjectSchema.userId)),
        ),
      );

    console.log(
      `📊 Found ${projectsWithoutCreatorMember.length} projects without creator membership`,
    );

    if (projectsWithoutCreatorMember.length === 0) {
      console.log(
        "✅ No migration needed - all projects already have creator membership",
      );
      return;
    }

    // Add each project creator as an owner member
    for (const project of projectsWithoutCreatorMember) {
      console.log(
        `  📝 Adding owner member for project: ${project.name} (${project.id})`,
      );

      await pgProjectMemberRepository.addProjectMember(
        project.id,
        project.userId,
        "owner",
      );
    }

    console.log(
      `✅ Migration completed! Added ${projectsWithoutCreatorMember.length} owner memberships`,
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run the migration if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  migrateExistingProjects()
    .then(() => {
      console.log("🎉 Migration script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration script failed:", error);
      process.exit(1);
    });
}

export { migrateExistingProjects };
