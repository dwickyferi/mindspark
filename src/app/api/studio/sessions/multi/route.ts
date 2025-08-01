import { NextRequest } from "next/server";
import { pgDb as db } from "lib/db/pg/db.pg";
import { StudioSessionSchema } from "lib/db/pg/schema.pg";
import { eq, desc } from "drizzle-orm";
import { getSessionForApi } from "lib/auth/server";

// GET - Fetch all sessions for the user
export async function GET() {
  try {
    const session = await getSessionForApi();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all user's studio sessions
    const studioSessions = await db
      .select({
        id: StudioSessionSchema.id,
        sessionName: StudioSessionSchema.sessionName,
        selectedDatasourceId: StudioSessionSchema.selectedDatasourceId,
        selectedDatabase: StudioSessionSchema.selectedDatabase,
        selectedSchema: StudioSessionSchema.selectedSchema,
        selectedTables: StudioSessionSchema.selectedTables,
        expandedSidebar: StudioSessionSchema.expandedSidebar,
        sessionMetadata: StudioSessionSchema.sessionMetadata,
        chartCards: StudioSessionSchema.chartCards,
        chartData: StudioSessionSchema.chartData,
        isActive: StudioSessionSchema.isActive,
        createdAt: StudioSessionSchema.createdAt,
        updatedAt: StudioSessionSchema.updatedAt,
      })
      .from(StudioSessionSchema)
      .where(eq(StudioSessionSchema.userId, userId))
      .orderBy(desc(StudioSessionSchema.updatedAt));

    // If no sessions exist, create a default one
    if (studioSessions.length === 0) {
      const defaultSession = await db
        .insert(StudioSessionSchema)
        .values({
          userId,
          sessionName: "New Sheet",
          selectedDatasourceId: null,
          selectedDatabase: null,
          selectedSchema: null,
          selectedTables: [],
          expandedSidebar: true,
          sessionMetadata: {},
          chartCards: [],
          isActive: true,
        })
        .returning();

      return Response.json({
        success: true,
        data: defaultSession.map((session) => ({
          id: session.id,
          sessionName: session.sessionName,
          selectedDatasourceId: session.selectedDatasourceId,
          selectedDatabase: session.selectedDatabase || "",
          selectedSchema: session.selectedSchema || "",
          selectedTables: session.selectedTables || [],
          expandedSidebar: session.expandedSidebar,
          sessionMetadata: session.sessionMetadata || {},
          chartCards: session.chartCards || [],
          chartData: session.chartData || {},
          isActive: session.isActive,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        })),
      });
    }

    return Response.json({
      success: true,
      data: studioSessions.map((session) => ({
        id: session.id,
        sessionName: session.sessionName,
        selectedDatasourceId: session.selectedDatasourceId,
        selectedDatabase: session.selectedDatabase || "",
        selectedSchema: session.selectedSchema || "",
        selectedTables: session.selectedTables || [],
        expandedSidebar: session.expandedSidebar,
        sessionMetadata: session.sessionMetadata || {},
        chartCards: session.chartCards || [],
        chartData: session.chartData || {},
        isActive: session.isActive,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch studio sessions:", error);
    return Response.json(
      { error: "Failed to fetch studio sessions" },
      { status: 500 },
    );
  }
}

// POST - Create a new session
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionForApi();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { sessionName } = body;

    // First, set all existing sessions to inactive
    await db
      .update(StudioSessionSchema)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(StudioSessionSchema.userId, userId));

    // Create new session
    const newSession = await db
      .insert(StudioSessionSchema)
      .values({
        userId,
        sessionName: sessionName || "New Sheet",
        selectedDatasourceId: null,
        selectedDatabase: null,
        selectedSchema: null,
        selectedTables: [],
        expandedSidebar: true,
        sessionMetadata: {},
        chartCards: [],
        chartData: {},
        isActive: true,
      })
      .returning();

    return Response.json({
      success: true,
      data: {
        id: newSession[0].id,
        sessionName: newSession[0].sessionName,
        selectedDatasourceId: newSession[0].selectedDatasourceId,
        selectedDatabase: newSession[0].selectedDatabase || "",
        selectedSchema: newSession[0].selectedSchema || "",
        selectedTables: newSession[0].selectedTables || [],
        expandedSidebar: newSession[0].expandedSidebar,
        sessionMetadata: newSession[0].sessionMetadata || {},
        chartCards: newSession[0].chartCards || [],
        chartData: newSession[0].chartData || {},
        isActive: newSession[0].isActive,
        createdAt: newSession[0].createdAt,
        updatedAt: newSession[0].updatedAt,
      },
      message: "Session created successfully",
    });
  } catch (error) {
    console.error("Failed to create studio session:", error);
    return Response.json(
      { error: "Failed to create studio session" },
      { status: 500 },
    );
  }
}
