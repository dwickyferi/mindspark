import { NextRequest } from "next/server";
import { getSession } from "lib/auth/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { chartId } = body;

    console.log(`💾 Saving chart config for chart ${chartId}`);

    // Here you would save the config to your database
    // For now, we'll just simulate success

    return Response.json({
      success: true,
      message: "Chart configuration saved successfully",
      chartId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to save chart config:", error);
    return Response.json(
      { error: "Failed to save chart configuration" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const chartId = searchParams.get("chartId");

    if (!chartId) {
      return Response.json({ error: "Chart ID is required" }, { status: 400 });
    }

    console.log(`📖 Loading chart config for chart ${chartId}`);

    // Here you would load the config from your database
    // For now, we'll return null to indicate no saved config

    return Response.json({
      success: true,
      config: null, // No saved config found
      chartId,
    });
  } catch (error) {
    console.error("Failed to load chart config:", error);
    return Response.json(
      { error: "Failed to load chart configuration" },
      { status: 500 },
    );
  }
}
