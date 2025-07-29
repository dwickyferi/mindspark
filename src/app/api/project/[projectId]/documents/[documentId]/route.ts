import { ragService } from "@/lib/ai/rag/service";
import { NextRequest, NextResponse } from "next/server";
import {
  verifyProjectAccess,
  handleProjectAccessError,
  ProjectAccessError,
} from "@/lib/auth/project-access";
import { z } from "zod";

const UpdateDocumentSchema = z.object({
  name: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  metadata: z.record(z.any()).optional(),
});

// GET /api/project/[projectId]/documents/[documentId] - Get a specific document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; documentId: string }> },
) {
  try {
    const { projectId, documentId } = await params;

    // Verify project access
    await verifyProjectAccess(projectId);

    const document = await ragService.getDocument(documentId);
    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    // Handle project access errors
    if (error instanceof ProjectAccessError) {
      return handleProjectAccessError(error);
    }

    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 },
    );
  }
}

// PUT /api/project/[projectId]/documents/[documentId] - Update a document
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; documentId: string }> },
) {
  try {
    const { projectId, documentId } = await params;

    // Verify project access with write permission
    await verifyProjectAccess(projectId);

    // Check if document exists
    const existingDocument = await ragService.getDocument(documentId);
    if (!existingDocument) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const updates = UpdateDocumentSchema.parse(body);

    const document = await ragService.updateDocument(documentId, updates);
    return NextResponse.json(document);
  } catch (error) {
    // Handle project access errors
    if (error instanceof ProjectAccessError) {
      return handleProjectAccessError(error);
    }

    console.error("Error updating document:", error);

    if (
      error instanceof Error &&
      error.message.includes("not suitable for RAG")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 },
    );
  }
}

// DELETE /api/project/[projectId]/documents/[documentId] - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; documentId: string }> },
) {
  try {
    const { projectId, documentId } = await params;

    // Verify project access with write permission
    await verifyProjectAccess(projectId);

    // Check if document exists
    const existingDocument = await ragService.getDocument(documentId);
    if (!existingDocument) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    await ragService.deleteDocument(documentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    // Handle project access errors
    if (error instanceof ProjectAccessError) {
      return handleProjectAccessError(error);
    }

    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 },
    );
  }
}
