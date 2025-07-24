import {
  generateEmbeddings,
  generateQueryEmbedding,
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
   * Add a document to the RAG system
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
      // Generate embeddings for the document content
      const embeddings = await generateEmbeddings(extractedContent);

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
   * Search for relevant content based on a query
   */
  async searchRelevantContent(
    projectId: string,
    query: string,
    limit: number = 5,
    threshold: number = 0.3,
    selectedDocumentIds?: string[],
  ): Promise<ChunkWithSimilarity[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      const queryEmbedding = await generateQueryEmbedding(query);
      return ragRepository.searchSimilarChunks(
        projectId,
        queryEmbedding,
        limit,
        threshold,
        selectedDocumentIds,
      );
    } catch (error) {
      console.error("Error searching for relevant content:", error);
      return [];
    }
  }

  /**
   * Generate context from search results for RAG
   */
  formatContextForRAG(chunks: ChunkWithSimilarity[]): string {
    if (chunks.length === 0) {
      return "";
    }

    const contextParts = chunks.map((chunk, index) => {
      const document = chunk.document;
      if (!document) {
        return `[${index + 1}] ${chunk.content.trim()}`;
      }

      // Format metadata header based on document type
      let metadataHeader = "";
      switch (document.documentType) {
        case "youtube":
          metadataHeader = `[Source: YouTube Video - "${document.name}"]`;
          break;
        case "web":
          const pageTitle = document.webTitle || document.name;
          const domain = document.webUrl
            ? new URL(document.webUrl).hostname
            : "";
          metadataHeader = `[Source: Web Page - "${pageTitle}"${domain ? ` (${domain})` : ""}]`;
          break;
        case "file":
        default:
          // Determine file type from mimeType or file extension
          const fileType = this.getFileTypeLabel(
            document.mimeType,
            document.name,
          );
          metadataHeader = `[Source: ${fileType} - "${document.name}"]`;
          break;
      }

      return `${metadataHeader}\nContent:\n${chunk.content.trim()}`;
    });

    return `Based on the following context from your project documents:\n\n${contextParts.join("\n\n")}`;
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
