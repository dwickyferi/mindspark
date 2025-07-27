import { NextRequest } from "next/server";
import { pgDb as db } from "lib/db/pg/db.pg";
import { ChartSchema } from "lib/db/pg/schema.pg";
import { eq, desc } from "drizzle-orm";
import { getSession } from "lib/auth/server";

// GET - Load user's studio charts
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user's charts ordered by most recent
    const charts = await db
      .select()
      .from(ChartSchema)
      .where(eq(ChartSchema.userId, userId))
      .orderBy(desc(ChartSchema.createdAt));

    return Response.json({
      success: true,
      data: charts,
    });
  } catch (error) {
    console.error("Failed to fetch studio charts:", error);
    return Response.json(
      { error: "Failed to fetch studio charts" },
      { status: 500 },
    );
  }
}

// POST - Save a new chart
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const {
      title,
      description,
      datasourceId,
      sqlQuery,
      chartType,
      chartConfig,
      dataCache,
      dataMode = "static",
      refreshInterval,
      tags = [],
    } = body;

    // Validate required fields
    if (!title || !datasourceId || !sqlQuery || !chartType || !chartConfig) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Insert new chart
    const [newChart] = await db
      .insert(ChartSchema)
      .values({
        title,
        description: description || null,
        userId,
        datasourceId,
        sqlQuery,
        chartType,
        chartConfig,
        dataCache: dataCache || null,
        dataMode,
        refreshInterval: refreshInterval || null,
        tags,
        isPinned: false,
      })
      .returning();

    return Response.json({
      success: true,
      data: newChart,
      message: "Chart saved successfully",
    });
  } catch (error) {
    console.error("Failed to save chart:", error);
    return Response.json({ error: "Failed to save chart" }, { status: 500 });
  }
}

// DELETE - Delete all user's charts (for reset functionality)
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Delete all user's charts
    const deletedCharts = await db
      .delete(ChartSchema)
      .where(eq(ChartSchema.userId, userId))
      .returning({ id: ChartSchema.id });

    return Response.json({
      success: true,
      data: { deletedCount: deletedCharts.length },
      message: `Successfully deleted ${deletedCharts.length} chart${deletedCharts.length !== 1 ? "s" : ""}`,
    });
  } catch (error) {
    console.error("Failed to delete all charts:", error);
    return Response.json(
      { error: "Failed to delete all charts" },
      { status: 500 },
    );
  }
}
