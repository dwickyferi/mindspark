import { NextRequest, NextResponse } from "next/server";
import { TextToSQLService } from "@/lib/text-to-sql/service";
import { DatasourceService } from "@/lib/services/datasource";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const datasourceId = searchParams.get("datasourceId");

    if (!datasourceId) {
      return NextResponse.json(
        { error: "Missing datasourceId parameter" },
        { status: 400 },
      );
    }

    // Get datasource configuration
    const datasourceResponse =
      await DatasourceService.getDatasource(datasourceId);

    if (
      !datasourceResponse.success ||
      !datasourceResponse.data?.connectionConfig
    ) {
      return NextResponse.json(
        { error: "Failed to get datasource configuration" },
        { status: 400 },
      );
    }

    // Get database schema
    const textToSQLService = new TextToSQLService();
    const result = await textToSQLService.getDatabaseSchema(
      datasourceResponse.data.connectionConfig,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in database schema API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
