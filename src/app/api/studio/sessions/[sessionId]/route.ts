import { NextRequest } from "next/server";
import { pgDb as db } from "lib/db/pg/db.pg";
import { StudioSessionSchema } from "lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";
import { getSession } from "lib/auth/server";

interface RouteParams {
  params: {
    sessionId: string;
  };
}

// GET - Fetch specific session
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { sessionId } = params;

    // Get the specific session
    const studioSession = await db
      .select()
      .from(StudioSessionSchema)
      .where(
        and(
          eq(StudioSessionSchema.id, sessionId),
          eq(StudioSessionSchema.userId, userId),
        ),
      )
      .limit(1);

    if (studioSession.length === 0) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: {
        id: studioSession[0].id,
        sessionName: studioSession[0].sessionName,
        selectedDatasourceId: studioSession[0].selectedDatasourceId,
        selectedDatabase: studioSession[0].selectedDatabase || "",
        selectedSchema: studioSession[0].selectedSchema || "",
        selectedTables: studioSession[0].selectedTables || [],
        expandedSidebar: studioSession[0].expandedSidebar,
        sessionMetadata: studioSession[0].sessionMetadata || {},
        chartCards: studioSession[0].chartCards || [],
        isActive: studioSession[0].isActive,
        createdAt: studioSession[0].createdAt,
        updatedAt: studioSession[0].updatedAt,
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

// PUT - Update specific session
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { sessionId } = params;
    const body = await request.json();

    const {
      sessionName,
      selectedDatasourceId,
      selectedDatabase,
      selectedSchema,
      selectedTables,
      expandedSidebar,
      sessionMetadata,
      chartCards,
      isActive,
    } = body;

    // If setting this session as active, deactivate all others first
    if (isActive) {
      await db
        .update(StudioSessionSchema)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(StudioSessionSchema.userId, userId));
    }

    // Update the session
    const updatedSession = await db
      .update(StudioSessionSchema)
      .set({
        ...(sessionName !== undefined && { sessionName }),
        ...(selectedDatasourceId !== undefined && { selectedDatasourceId }),
        ...(selectedDatabase !== undefined && { selectedDatabase }),
        ...(selectedSchema !== undefined && { selectedSchema }),
        ...(selectedTables !== undefined && { selectedTables }),
        ...(expandedSidebar !== undefined && { expandedSidebar }),
        ...(sessionMetadata !== undefined && { sessionMetadata }),
        ...(chartCards !== undefined && { chartCards }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(StudioSessionSchema.id, sessionId),
          eq(StudioSessionSchema.userId, userId),
        ),
      )
      .returning();

    if (updatedSession.length === 0) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: {
        id: updatedSession[0].id,
        sessionName: updatedSession[0].sessionName,
        selectedDatasourceId: updatedSession[0].selectedDatasourceId,
        selectedDatabase: updatedSession[0].selectedDatabase || "",
        selectedSchema: updatedSession[0].selectedSchema || "",
        selectedTables: updatedSession[0].selectedTables || [],
        expandedSidebar: updatedSession[0].expandedSidebar,
        sessionMetadata: updatedSession[0].sessionMetadata || {},
        chartCards: updatedSession[0].chartCards || [],
        isActive: updatedSession[0].isActive,
        createdAt: updatedSession[0].createdAt,
        updatedAt: updatedSession[0].updatedAt,
      },
      message: "Session updated successfully",
    });
  } catch (error) {
    console.error("Failed to update studio session:", error);
    return Response.json(
      { error: "Failed to update studio session" },
      { status: 500 },
    );
  }
}

// DELETE - Delete specific session
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { sessionId } = params;

    // Check if session exists and belongs to user
    const existingSession = await db
      .select()
      .from(StudioSessionSchema)
      .where(
        and(
          eq(StudioSessionSchema.id, sessionId),
          eq(StudioSessionSchema.userId, userId),
        ),
      )
      .limit(1);

    if (existingSession.length === 0) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    // Delete the session
    await db
      .delete(StudioSessionSchema)
      .where(
        and(
          eq(StudioSessionSchema.id, sessionId),
          eq(StudioSessionSchema.userId, userId),
        ),
      );

    // If this was the active session, check if there are other sessions
    if (existingSession[0].isActive) {
      const remainingSessions = await db
        .select()
        .from(StudioSessionSchema)
        .where(eq(StudioSessionSchema.userId, userId))
        .limit(1);

      // If there are remaining sessions, make the most recent one active
      if (remainingSessions.length > 0) {
        await db
          .update(StudioSessionSchema)
          .set({ isActive: true, updatedAt: new Date() })
          .where(eq(StudioSessionSchema.id, remainingSessions[0].id));
      }
    }

    return Response.json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete studio session:", error);
    return Response.json(
      { error: "Failed to delete studio session" },
      { status: 500 },
    );
  }
}
