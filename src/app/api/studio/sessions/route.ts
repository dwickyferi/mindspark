import { NextRequest } from "next/server";
import { pgDb as db } from "lib/db/pg/db.pg";
import { StudioSessionSchema } from "lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import { getSessionForApi } from "lib/auth/server";

export async function GET() {
  try {
    const session = await getSessionForApi();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's studio session
    const studioSession = await db
      .select()
      .from(StudioSessionSchema)
      .where(eq(StudioSessionSchema.userId, userId))
      .limit(1);

    if (studioSession.length === 0) {
      // Return empty session state if none exists
      return Response.json({
        success: true,
        data: {
          selectedDatasourceId: null,
          selectedDatabase: "",
          selectedSchema: "",
          selectedTables: [],
          expandedSidebar: true,
          sessionMetadata: {},
        },
      });
    }

    return Response.json({
      success: true,
      data: {
        selectedDatasourceId: studioSession[0].selectedDatasourceId,
        selectedDatabase: studioSession[0].selectedDatabase || "",
        selectedSchema: studioSession[0].selectedSchema || "",
        selectedTables: studioSession[0].selectedTables || [],
        expandedSidebar: studioSession[0].expandedSidebar,
        sessionMetadata: studioSession[0].sessionMetadata || {},
      },
    });
  } catch (error) {
    console.error("Failed to fetch studio session:", error);
    return Response.json(
      { error: "Failed to fetch studio session" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionForApi();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const {
      selectedDatasourceId,
      selectedDatabase,
      selectedSchema,
      selectedTables,
      expandedSidebar,
      sessionMetadata,
    } = body;

    // Upsert studio session (update if exists, create if not)
    const existingSession = await db
      .select()
      .from(StudioSessionSchema)
      .where(eq(StudioSessionSchema.userId, userId))
      .limit(1);

    if (existingSession.length > 0) {
      // Update existing session
      await db
        .update(StudioSessionSchema)
        .set({
          selectedDatasourceId: selectedDatasourceId || null,
          selectedDatabase: selectedDatabase || null,
          selectedSchema: selectedSchema || null,
          selectedTables: selectedTables || [],
          expandedSidebar: expandedSidebar ?? true,
          sessionMetadata: sessionMetadata || {},
          updatedAt: new Date(),
        })
        .where(eq(StudioSessionSchema.userId, userId));
    } else {
      // Create new session
      await db.insert(StudioSessionSchema).values({
        userId,
        selectedDatasourceId: selectedDatasourceId || null,
        selectedDatabase: selectedDatabase || null,
        selectedSchema: selectedSchema || null,
        selectedTables: selectedTables || [],
        expandedSidebar: expandedSidebar ?? true,
        sessionMetadata: sessionMetadata || {},
      });
    }

    return Response.json({
      success: true,
      message: "Studio session saved successfully",
    });
  } catch (error) {
    console.error("Failed to save studio session:", error);
    return Response.json(
      { error: "Failed to save studio session" },
      { status: 500 },
    );
  }
}
