import { ragService } from "@/lib/ai/rag/service";
import { DocumentUploadSchema } from "app-types/rag";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "auth/server";

// GET /api/project/[projectId]/documents - Get all documents for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const documents = await ragService.getDocumentsByProject(projectId);
    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

// POST /api/project/[projectId]/documents - Add a new document
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
    const body = await request.json();
    const documentData = DocumentUploadSchema.parse(body);

    const document = await ragService.addDocument(
      projectId,
      session.user.id,
      documentData
    );

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error adding document:", error);
    
    if (error instanceof Error && error.message.includes("not suitable for RAG")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to add document" },
      { status: 500 }
    );
  }
}
