import { NextRequest, NextResponse } from "next/server";
import { TextToSQLService } from "@/lib/text-to-sql/service";
import { DatasourceService } from "@/lib/services/datasource";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      selectedTables,
      datasourceId,
      aiProvider = "openai",
      aiModel = "gpt-4",
      maxRetries = 3,
    } = body;

    if (!query || !selectedTables || !datasourceId) {
      return NextResponse.json(
        {
          error:
            "Missing required parameters: query, selectedTables, or datasourceId",
        },
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

    // Generate and execute SQL
    const textToSQLService = new TextToSQLService();
    const response = await textToSQLService.generateAndExecuteSQL({
      query,
      selectedTables,
      datasourceId,
      datasourceConfig: datasourceResponse.data.connectionConfig,
      aiProvider,
      aiModel,
      maxRetries,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in text-to-SQL API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
