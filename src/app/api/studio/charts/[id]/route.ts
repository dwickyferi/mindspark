import { NextRequest } from "next/server";
import { pgDb as db } from "lib/db/pg/db.pg";
import { ChartSchema } from "lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";
import { getSession } from "lib/auth/server";

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
