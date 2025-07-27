import { NextRequest } from "next/server";
import { pgDb as db } from "lib/db/pg/db.pg";
import { ChartSchema } from "lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";
import { getSession } from "lib/auth/server";

// PATCH - Update only the title of a specific chart
export async function PATCH(
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

    const { title } = body;

    // Validate title
    if (!title || typeof title !== "string") {
      return Response.json(
        { error: "Title is required and must be a non-empty string" },
        { status: 400 },
      );
    }

    // Trim and validate title length
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      return Response.json({ error: "Title cannot be empty" }, { status: 400 });
    }

    if (trimmedTitle.length > 255) {
      return Response.json(
        { error: "Title cannot exceed 255 characters" },
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

    // Update both the chart title and the title in chartConfig to keep them in sync
    const currentChartConfig = existingChart[0].chartConfig as any;
    const updatedChartConfig = {
      ...currentChartConfig,
      title: trimmedTitle, // Update the title in chartConfig as well
    };

    // Update the chart title and chartConfig
    const [updatedChart] = await db
      .update(ChartSchema)
      .set({
        title: trimmedTitle,
        chartConfig: updatedChartConfig,
        updatedAt: new Date(),
      })
      .where(and(eq(ChartSchema.id, id), eq(ChartSchema.userId, userId)))
      .returning();

    return Response.json({
      success: true,
      data: {
        id: updatedChart.id,
        title: updatedChart.title,
        updatedAt: updatedChart.updatedAt,
      },
      message: "Chart title updated successfully",
    });
  } catch (error) {
    console.error("Failed to update chart title:", error);
    return Response.json(
      { error: "Failed to update chart title" },
      { status: 500 },
    );
  }
}
