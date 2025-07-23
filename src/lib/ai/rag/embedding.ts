import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

// Use the same embedding model as in the cookbook
const embeddingModel = openai.embedding("text-embedding-3-small");

/**
 * Generate chunks from text content
 * Using sentence-based chunking as recommended in the AI SDK cookbook
 */
export function generateChunks(input: string): string[] {
  return input
    .trim()
    .split(/[.!?]+/)
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 0 && chunk.length > 10) // Filter out very short chunks
    .map(chunk => {
      // Ensure each chunk ends with proper punctuation
      if (!chunk.match(/[.!?]$/)) {
        chunk += '.';
      }
      return chunk;
    });
}

/**
 * Generate embeddings for multiple text chunks
 */
export async function generateEmbeddings(
  value: string,
): Promise<Array<{ embedding: number[]; content: string; chunkIndex: number }>> {
  const chunks = generateChunks(value);
  
  if (chunks.length === 0) {
    throw new Error("No valid chunks could be generated from the input text");
  }

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });

  return embeddings.map((embedding, index) => ({
    content: chunks[index],
    embedding,
    chunkIndex: index
  }));
}

/**
 * Generate a single embedding for a query
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const input = query.replace(/\n/g, ' ').trim();
  
  if (!input) {
    throw new Error("Query cannot be empty");
  }

  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });

  return embedding;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Simple text extraction from different file types
 * In a production environment, you might want to use more sophisticated
 * libraries for PDF, DOCX, etc.
 */
export function extractTextFromFile(content: string, mimeType: string): string {
  switch (mimeType) {
    case 'text/plain':
    case 'text/markdown':
    case 'application/json':
      return content;
    case 'text/html':
      // Basic HTML tag removal
      return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    default:
      // For other types, assume it's already text content
      return content;
  }
}

/**
 * Validate if content is suitable for RAG processing
 */
export function validateContentForRAG(content: string, mimeType: string): { isValid: boolean; reason?: string } {
  const extractedText = extractTextFromFile(content, mimeType);
  
  if (!extractedText || extractedText.trim().length === 0) {
    return { isValid: false, reason: "No text content could be extracted" };
  }

  if (extractedText.length < 10) {
    return { isValid: false, reason: "Content is too short for meaningful RAG processing" };
  }

  const chunks = generateChunks(extractedText);
  if (chunks.length === 0) {
    return { isValid: false, reason: "No valid chunks could be generated from the content" };
  }

  return { isValid: true };
}
