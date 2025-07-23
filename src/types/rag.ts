import { z } from "zod";

export type Document = {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  content: string;
  mimeType: string;
  size: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
};

export type DocumentChunk = {
  id: string;
  documentId: string;
  projectId: string;
  content: string;
  embedding: number[];
  chunkIndex: number;
  metadata: Record<string, any>;
  createdAt: Date;
};

export type DocumentUpload = {
  name: string;
  content: string;
  mimeType: string;
  size: number;
};

export type ChunkWithSimilarity = DocumentChunk & {
  similarity: number;
  document?: Pick<Document, 'name' | 'mimeType'>;
};

export const DocumentUploadSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  content: z.string().min(1, "Document content cannot be empty"),
  mimeType: z.string().min(1, "MIME type is required"),
  size: z.number().positive("File size must be positive"),
});

export interface RAGRepository {
  // Document operations
  createDocument(projectId: string, userId: string, document: DocumentUpload): Promise<Document>;
  getDocumentsByProjectId(projectId: string): Promise<Document[]>;
  getDocumentById(id: string): Promise<Document | null>;
  deleteDocument(id: string): Promise<void>;
  updateDocument(id: string, updates: Partial<Pick<Document, 'name' | 'content' | 'metadata'>>): Promise<Document>;

  // Chunk operations
  createChunks(chunks: Array<Omit<DocumentChunk, 'id' | 'createdAt'>>): Promise<DocumentChunk[]>;
  deleteChunksByDocumentId(documentId: string): Promise<void>;
  searchSimilarChunks(projectId: string, queryEmbedding: number[], limit?: number, threshold?: number): Promise<ChunkWithSimilarity[]>;
  getChunksByDocumentId(documentId: string): Promise<DocumentChunk[]>;
}
