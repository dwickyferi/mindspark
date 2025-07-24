import { ragService } from "@/lib/ai/rag/service";
import { chatRepository } from "@/lib/db/repository";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "auth/server";

// POST /api/project/[projectId]/search - Search for relevant content in project documents
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const { query, limit = 5, threshold = 0.3 } = await request.json();

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Get project details to access selected documents
    const project = await chatRepository.selectProjectById(projectId);
    const selectedDocumentIds = project?.selectedDocuments || [];

    const results = await ragService.searchRelevantContent(
      projectId,
      query.trim(),
      Math.min(Math.max(Number(limit) || 5, 1), 20), // Limit between 1-20
      Math.min(Math.max(Number(threshold) || 0.3, 0), 1), // Threshold between 0-1
      selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined
    );

    return NextResponse.json({
      query: query.trim(),
      results,
      context: ragService.formatContextForRAG(results),
    });
  } catch (error) {
    console.error("Error searching documents:", error);
    return NextResponse.json(
      { error: "Failed to search documents" },
      { status: 500 }
    );
  }
}
