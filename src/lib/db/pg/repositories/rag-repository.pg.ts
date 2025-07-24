import { eq, desc, and, inArray } from "drizzle-orm";
import { pgDb } from "../db.pg";
import { DocumentSchema, DocumentChunkSchema } from "../schema.pg";
import type { RAGRepository, Document, DocumentChunk, DocumentUpload, ChunkWithSimilarity } from "app-types/rag";
import { cosineSimilarity } from "@/lib/ai/rag/embedding";

export const pgRAGRepository: RAGRepository = {
  // Document operations
  async createDocument(projectId: string, userId: string, document: DocumentUpload): Promise<Document> {
    const [newDocument] = await pgDb
      .insert(DocumentSchema)
      .values({
        projectId,
        userId,
        name: document.name,
        content: document.content,
        mimeType: document.mimeType,
        size: document.size,
        metadata: {},
      })
      .returning();

    return newDocument as Document;
  },

  async getDocumentsByProjectId(projectId: string): Promise<Document[]> {
    const documents = await pgDb
      .select()
      .from(DocumentSchema)
      .where(eq(DocumentSchema.projectId, projectId))
      .orderBy(desc(DocumentSchema.createdAt));

    return documents as Document[];
  },

  async getDocumentById(id: string): Promise<Document | null> {
    const [document] = await pgDb
      .select()
      .from(DocumentSchema)
      .where(eq(DocumentSchema.id, id))
      .limit(1);

    return document ? (document as Document) : null;
  },

  async deleteDocument(id: string): Promise<void> {
    // Chunks will be deleted automatically due to CASCADE foreign key
    await pgDb
      .delete(DocumentSchema)
      .where(eq(DocumentSchema.id, id));
  },

  async updateDocument(id: string, updates: Partial<Pick<Document, 'name' | 'content' | 'metadata'>>): Promise<Document> {
    const [updatedDocument] = await pgDb
      .update(DocumentSchema)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(DocumentSchema.id, id))
      .returning();

    return updatedDocument as Document;
  },

  // Chunk operations
  async createChunks(chunks: Array<Omit<DocumentChunk, 'id' | 'createdAt'>>): Promise<DocumentChunk[]> {
    if (chunks.length === 0) return [];

    const chunksToInsert = chunks.map(chunk => ({
      ...chunk,
      embedding: chunk.embedding.map(String), // Convert numbers to strings for storage
    }));

    const newChunks = await pgDb
      .insert(DocumentChunkSchema)
      .values(chunksToInsert)
      .returning();

    return newChunks.map(chunk => ({
      ...chunk,
      embedding: chunk.embedding?.map(Number) || [], // Convert back to numbers
    })) as DocumentChunk[];
  },

  async deleteChunksByDocumentId(documentId: string): Promise<void> {
    await pgDb
      .delete(DocumentChunkSchema)
      .where(eq(DocumentChunkSchema.documentId, documentId));
  },

  async searchSimilarChunks(
    projectId: string, 
    queryEmbedding: number[], 
    limit: number = 5, 
    threshold: number = 0.3,
    selectedDocumentIds?: string[]
  ): Promise<ChunkWithSimilarity[]> {
    // Build the where conditions
    const whereConditions = [eq(DocumentChunkSchema.projectId, projectId)];
    
    // If selectedDocumentIds is provided and not empty, filter by those documents
    if (selectedDocumentIds && selectedDocumentIds.length > 0) {
      whereConditions.push(inArray(DocumentChunkSchema.documentId, selectedDocumentIds));
    }

    // Get chunks for the project (and optionally filtered by selected documents)
    const chunks = await pgDb
      .select({
        chunk: DocumentChunkSchema,
        document: {
          name: DocumentSchema.name,
          mimeType: DocumentSchema.mimeType,
        }
      })
      .from(DocumentChunkSchema)
      .leftJoin(DocumentSchema, eq(DocumentChunkSchema.documentId, DocumentSchema.id))
      .where(and(...whereConditions));

    // Calculate similarities in memory since we don't have pgvector properly set up
    const chunksWithSimilarity = chunks
      .map(({ chunk, document }) => {
        const chunkEmbedding = chunk.embedding?.map(Number) || [];
        if (chunkEmbedding.length === 0) return null;

        const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
        
        return {
          ...chunk,
          embedding: chunkEmbedding,
          similarity,
          document,
        } as ChunkWithSimilarity;
      })
      .filter((chunk): chunk is ChunkWithSimilarity => chunk !== null && chunk.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return chunksWithSimilarity;
  },

  async getChunksByDocumentId(documentId: string): Promise<DocumentChunk[]> {
    const chunks = await pgDb
      .select()
      .from(DocumentChunkSchema)
      .where(eq(DocumentChunkSchema.documentId, documentId))
      .orderBy(DocumentChunkSchema.chunkIndex);

    return chunks.map(chunk => ({
      ...chunk,
      embedding: chunk.embedding?.map(Number) || [],
    })) as DocumentChunk[];
  },
};
