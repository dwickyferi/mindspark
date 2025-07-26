import { NextRequest } from "next/server";
import { pgDb as db } from "lib/db/pg/db.pg";
import { ChartSchema } from "lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";
import { getSession } from "lib/auth/server";

// PUT - Update a specific chart
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return Response.json({ error: "Chart ID is required" }, { status: 400 });
    }

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

    // Check if chart exists and belongs to user
    const existingChart = await db
      .select()
      .from(ChartSchema)
      .where(and(eq(ChartSchema.id, id), eq(ChartSchema.userId, userId)))
      .limit(1);

    if (existingChart.length === 0) {
      return Response.json(
        { error: "Chart not found or access denied" },
        { status: 404 },
      );
    }

    // Update the chart
    const [updatedChart] = await db
      .update(ChartSchema)
      .set({
        title,
        description: description || null,
        datasourceId,
        sqlQuery,
        chartType,
        chartConfig,
        dataCache: dataCache || null,
        dataMode,
        refreshInterval: refreshInterval || null,
        tags,
        updatedAt: new Date(),
      })
      .where(and(eq(ChartSchema.id, id), eq(ChartSchema.userId, userId)))
      .returning();

    return Response.json({
      success: true,
      data: updatedChart,
      message: "Chart updated successfully",
    });
  } catch (error) {
    console.error("Failed to update chart:", error);
    return Response.json({ error: "Failed to update chart" }, { status: 500 });
  }
}

// DELETE - Delete a specific chart
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await params;

    if (!id) {
      return Response.json({ error: "Chart ID is required" }, { status: 400 });
    }

    // Check if chart exists and belongs to user
    const existingChart = await db
      .select()
      .from(ChartSchema)
      .where(and(eq(ChartSchema.id, id), eq(ChartSchema.userId, userId)))
      .limit(1);

    if (existingChart.length === 0) {
      return Response.json(
        { error: "Chart not found or access denied" },
        { status: 404 },
      );
    }

    // Delete the chart
    await db
      .delete(ChartSchema)
      .where(and(eq(ChartSchema.id, id), eq(ChartSchema.userId, userId)));

    return Response.json({
      success: true,
      message: "Chart deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete chart:", error);
    return Response.json({ error: "Failed to delete chart" }, { status: 500 });
  }
}
