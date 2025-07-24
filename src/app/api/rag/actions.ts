"use server";

import { ragService } from "@/lib/ai/rag/service";
import { DocumentUploadSchema, WebPageUploadSchema } from "app-types/rag";
import { getSession } from "auth/server";
import { webPageService } from "@/lib/ai/rag/web-page-service";

export async function getUserId() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("User not found");
  }
  return userId;
}

export async function addDocumentAction(projectId: string, documentData: any) {
  const userId = await getUserId();
  const validatedData = DocumentUploadSchema.parse(documentData);
  
  return ragService.addDocument(projectId, userId, validatedData);
}

export async function addWebPageAction(projectId: string, data: { url: string }) {
  const userId = await getUserId();
  const validatedData = WebPageUploadSchema.parse(data);
  
  console.log("🔍 Server Action Debug - addWebPageAction called");
  console.log("- URL:", validatedData.url);
  console.log("- TAVILY_API_KEY in server action:", !!process.env.TAVILY_API_KEY);
  console.log("- Environment context:", process.env.NODE_ENV);
  
  try {
    // Extract content from the web page
    const documentData = await webPageService.extractWebPageContent(validatedData.url);
    
    return ragService.addDocument(projectId, userId, documentData);
  } catch (error) {
    console.error("❌ Error in addWebPageAction:", error);
    throw error;
  }
}

export async function previewWebPageAction(data: { url: string }) {
  const validatedData = WebPageUploadSchema.parse(data);
  
  console.log("🔍 Server Action Debug - previewWebPageAction called");
  console.log("- URL:", validatedData.url);
  console.log("- TAVILY_API_KEY in server action:", !!process.env.TAVILY_API_KEY);
  
  try {
    // Extract content from the web page for preview
    const documentData = await webPageService.extractWebPageContent(validatedData.url);
    
    return {
      title: documentData.webTitle || documentData.name,
      url: documentData.webUrl!,
      contentPreview: documentData.content.substring(0, 300) + "...",
      size: documentData.size,
    };
  } catch (error) {
    console.error("❌ Error in previewWebPageAction:", error);
    throw error;
  }
}

export async function getDocumentsAction(projectId: string) {
  await getUserId(); // Ensure user is authenticated
  return ragService.getDocumentsByProject(projectId);
}

export async function deleteDocumentAction(documentId: string) {
  const userId = await getUserId();
  
  // Check ownership
  const document = await ragService.getDocument(documentId);
  if (!document) {
    throw new Error("Document not found");
  }
  
  if (document.userId !== userId) {
    throw new Error("Unauthorized");
  }
  
  return ragService.deleteDocument(documentId);
}

export async function updateDocumentAction(
  documentId: string, 
  updates: { name?: string; content?: string; metadata?: Record<string, any> }
) {
  const userId = await getUserId();
  
  // Check ownership
  const document = await ragService.getDocument(documentId);
  if (!document) {
    throw new Error("Document not found");
  }
  
  if (document.userId !== userId) {
    throw new Error("Unauthorized");
  }
  
  return ragService.updateDocument(documentId, updates);
}

export async function searchDocumentsAction(
  projectId: string, 
  query: string, 
  limit: number = 5, 
  threshold: number = 0.3,
  selectedDocumentIds?: string[]
) {
  await getUserId(); // Ensure user is authenticated
  
  if (!query.trim()) {
    return { results: [], context: "" };
  }
  
  const results = await ragService.searchRelevantContent(projectId, query, limit, threshold, selectedDocumentIds);
  const context = ragService.formatContextForRAG(results);
  
  return { results, context };
}
