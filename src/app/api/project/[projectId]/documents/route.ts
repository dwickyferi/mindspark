import { ragService } from "@/lib/ai/rag/service";
import { DocumentUploadSchema } from "app-types/rag";
import { NextRequest, NextResponse } from "next/server";
import {
  verifyProjectAccess,
  handleProjectAccessError,
} from "lib/auth/project-access";

// GET /api/project/[projectId]/documents - Get all documents for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;

    // Verify project access
    await verifyProjectAccess(projectId);

    const documents = await ragService.getDocumentsByProject(projectId);
    return NextResponse.json(documents);
  } catch (error) {
    const errorResponse = handleProjectAccessError(error);
    if (errorResponse.status !== 500) {
      return errorResponse;
    }

    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 },
    );
  }
}

// POST /api/project/[projectId]/documents - Add a new document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;

    // Verify project access (members can add documents)
    const context = await verifyProjectAccess(projectId);

    const body = await request.json();
    const documentData = DocumentUploadSchema.parse(body);

    const document = await ragService.addDocument(
      projectId,
      context.userId,
      documentData,
    );

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    const errorResponse = handleProjectAccessError(error);
    if (errorResponse.status !== 500) {
      return errorResponse;
    }

    console.error("Error adding document:", error);

    if (
      error instanceof Error &&
      error.message.includes("not suitable for RAG")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to add document" },
      { status: 500 },
    );
  }
}
