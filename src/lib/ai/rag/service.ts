import {
  generateEmbeddings,
  generateContextualEmbeddings,
  extractTextFromFile,
  validateContentForRAG,
} from "./embedding";
import { ragRepository } from "@/lib/db/repository";
import type {
  Document,
  DocumentUpload,
  ChunkWithSimilarity,
} from "app-types/rag";

export class RAGService {
  /**
   * Add a document to the RAG system with enhanced contextual embedding
   */
  async addDocument(
    projectId: string,
    userId: string,
    documentData: DocumentUpload,
  ): Promise<Document> {
    // Extract and validate content
    const extractedContent = extractTextFromFile(
      documentData.content,
      documentData.mimeType,
    );
    const validation = validateContentForRAG(
      extractedContent,
      documentData.mimeType,
    );

    if (!validation.isValid) {
      throw new Error(`Document is not suitable for RAG: ${validation.reason}`);
    }

    // Create the document
    const document = await ragRepository.createDocument(projectId, userId, {
      ...documentData,
      content: extractedContent,
    });

    try {
      // Generate contextual embeddings with document metadata for better retrieval
      const documentContext = {
        title: documentData.name,
        type: this.getFileTypeLabel(documentData.mimeType, documentData.name),
        source: documentData.documentType || "file",
      };

      // Use contextual embeddings if available, fallback to regular embeddings
      let embeddings;
      try {
        embeddings = await generateContextualEmbeddings(
          extractedContent,
          documentContext,
        );
      } catch (error) {
        console.warn(
          "Contextual embeddings failed, falling back to regular embeddings:",
          error,
        );
        embeddings = await generateEmbeddings(extractedContent);
      }

      // Create chunks with embeddings
      const chunks = embeddings.map(({ content, embedding, chunkIndex }) => ({
        documentId: document.id,
        projectId,
        content,
        embedding,
        chunkIndex,
        metadata: {},
      }));

      await ragRepository.createChunks(chunks);

      return document;
    } catch (error) {
      // If embedding fails, clean up the document
      await ragRepository.deleteDocument(document.id);
      throw new Error(
        `Failed to process document for RAG: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Update a document and regenerate embeddings
   */
  async updateDocument(
    documentId: string,
    updates: {
      name?: string;
      content?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<Document> {
    const document = await ragRepository.getDocumentById(documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // If content is being updated, regenerate embeddings
    if (updates.content) {
      const extractedContent = extractTextFromFile(
        updates.content,
        document.mimeType,
      );
      const validation = validateContentForRAG(
        extractedContent,
        document.mimeType,
      );

      if (!validation.isValid) {
        throw new Error(
          `Updated content is not suitable for RAG: ${validation.reason}`,
        );
      }

      // Delete old chunks
      await ragRepository.deleteChunksByDocumentId(documentId);

      // Generate new embeddings
      const embeddings = await generateEmbeddings(extractedContent);

      // Create new chunks
      const chunks = embeddings.map(({ content, embedding, chunkIndex }) => ({
        documentId,
        projectId: document.projectId,
        content,
        embedding,
        chunkIndex,
        metadata: {},
      }));

      await ragRepository.createChunks(chunks);
      updates.content = extractedContent;
    }

    return ragRepository.updateDocument(documentId, updates);
  }

  /**
   * Delete a document and all its chunks
   */
  async deleteDocument(documentId: string): Promise<void> {
    return ragRepository.deleteDocument(documentId);
  }

  /**
   * Get all documents for a project
   */
  async getDocumentsByProject(projectId: string): Promise<Document[]> {
    return ragRepository.getDocumentsByProjectId(projectId);
  }

  /**
   * Get all content from selected documents for fixed context inclusion
   */
  async getSelectedDocumentsContent(
    projectId: string,
    selectedDocumentIds: string[],
  ): Promise<ChunkWithSimilarity[]> {
    if (!selectedDocumentIds || selectedDocumentIds.length === 0) {
      return [];
    }

    try {
      // Get all chunks from selected documents without any filtering
      const allChunks = await ragRepository.getAllChunksFromDocuments(
        projectId,
        selectedDocumentIds,
      );

      // Return chunks with similarity set to 1.0 (full relevance)
      return allChunks.map((chunk) => ({
        ...chunk,
        similarity: 1.0, // Fixed high relevance for selected documents
      }));
    } catch (error) {
      console.error("Error getting selected documents content:", error);
      return [];
    }
  }

  /**
   * Generate enhanced context from search results for RAG with improved formatting
   */ /**
   * Generate enhanced context from search results for RAG with simplified formatting
   */
  formatContextForRAG(chunks: ChunkWithSimilarity[]): string {
    if (chunks.length === 0) {
      return "";
    }

    // Group chunks by document to avoid redundant metadata
    const documentGroups = new Map<
      string,
      { document: any; chunks: ChunkWithSimilarity[] }
    >();

    chunks.forEach((chunk) => {
      const document = chunk.document;
      if (!document) return;

      const docId = document.name || "unknown";
      if (!documentGroups.has(docId)) {
        documentGroups.set(docId, { document, chunks: [] });
      }
      documentGroups.get(docId)!.chunks.push(chunk);
    });

    const contextParts: string[] = [];
    let sourceIndex = 1;

    documentGroups.forEach(({ document, chunks: docChunks }, docId) => {
      // Create simple metadata header without relevance scores
      let metadataHeader = "";
      let sourceType = "Document";

      switch (document.documentType) {
        case "youtube":
          sourceType = "YouTube Video";
          metadataHeader = `[Source ${sourceIndex}: ${sourceType}]\nTitle: "${document.name}"\nType: Video Transcript`;
          break;
        case "web":
          sourceType = "Web Page";
          const pageTitle = document.webTitle || document.name;
          const domain = document.webUrl
            ? new URL(document.webUrl).hostname
            : "";
          metadataHeader = `[Source ${sourceIndex}: ${sourceType}]\nTitle: "${pageTitle}"${domain ? `\nDomain: ${domain}` : ""}\nType: Web Content`;
          break;
        case "file":
        default:
          const fileType = this.getFileTypeLabel(
            document.mimeType,
            document.name,
          );
          sourceType = fileType;
          metadataHeader = `[Source ${sourceIndex}: ${sourceType}]\nFilename: "${document.name}"\nType: ${fileType}`;
          break;
      }

      // Format content sections without relevance scores
      const contentSections = docChunks.map((chunk, index) => {
        const sectionHeader =
          docChunks.length > 1 ? `\nSection ${index + 1}:` : "\nContent:";
        return `${sectionHeader}\n${chunk.content.trim()}`;
      });

      contextParts.push(
        `${metadataHeader}${contentSections.join("\n")}\n${"=".repeat(50)}`,
      );
      sourceIndex++;
    });

    // Create the final formatted context with clear structure
    return `<knowledge_context>
You have access to information from the project's knowledge base. Use this information to provide accurate, contextual responses. Each source is clearly labeled with metadata.

${contextParts.join("\n\n")}

Instructions:
- Reference sources by their number and type when citing information (e.g., "According to Source 1 (YouTube Video)...")
- If information conflicts between sources, acknowledge the discrepancy
- If asked about a specific source type (e.g., "the video", "the document"), use the metadata to identify which source is being referenced
</knowledge_context>`;
  }

  /**
   * Get a user-friendly file type label from MIME type or filename
   */
  private getFileTypeLabel(mimeType: string, fileName: string): string {
    // First try to determine from MIME type
    const mimeTypeMap: Record<string, string> = {
      "application/pdf": "PDF Document",
      "application/msword": "Word Document",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        "Word Document",
      "application/vnd.ms-excel": "Excel Spreadsheet",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        "Excel Spreadsheet",
      "application/vnd.ms-powerpoint": "PowerPoint Presentation",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        "PowerPoint Presentation",
      "text/plain": "Text File",
      "text/markdown": "Markdown File",
      "text/html": "HTML File",
      "text/csv": "CSV File",
      "application/json": "JSON File",
      "application/xml": "XML File",
      "text/xml": "XML File",
    };

    if (mimeTypeMap[mimeType]) {
      return mimeTypeMap[mimeType];
    }

    // Fallback to file extension
    const extension = fileName.split(".").pop()?.toLowerCase();
    const extensionMap: Record<string, string> = {
      pdf: "PDF Document",
      doc: "Word Document",
      docx: "Word Document",
      xls: "Excel Spreadsheet",
      xlsx: "Excel Spreadsheet",
      ppt: "PowerPoint Presentation",
      pptx: "PowerPoint Presentation",
      txt: "Text File",
      md: "Markdown File",
      html: "HTML File",
      htm: "HTML File",
      csv: "CSV File",
      json: "JSON File",
      xml: "XML File",
    };

    return extension && extensionMap[extension]
      ? extensionMap[extension]
      : "File";
  }

  /**
   * Get a document by ID
   */
  async getDocument(documentId: string): Promise<Document | null> {
    return ragRepository.getDocumentById(documentId);
  }
}

export const ragService = new RAGService();
