import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

// Use the same embedding model as in the cookbook
const embeddingModel = openai.embedding("text-embedding-3-small");

/**
 * Generate chunks from text content using improved chunking strategy
 * Following AI SDK best practices with sentence-based chunking and semantic boundaries
 */
export function generateChunks(input: string): string[] {
  if (!input?.trim()) {
    return [];
  }

  const text = input.trim();

  // For very short content, return as single chunk
  if (text.length < 200) {
    return [text];
  }

  // Split by sentences, keeping sentence endings
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20); // Filter out very short fragments

  if (sentences.length === 0) {
    return [text];
  }

  const chunks: string[] = [];
  const targetChunkSize = 600; // Optimal size for embeddings (increased from 400)
  const maxChunkSize = 1000; // Maximum chunk size
  const minChunkSize = 150; // Minimum chunk size
  const overlapSentences = 2; // Number of sentences to overlap between chunks

  let currentChunk = "";
  let sentenceIndex = 0;

  while (sentenceIndex < sentences.length) {
    const sentence = sentences[sentenceIndex];
    const potentialChunk = currentChunk
      ? `${currentChunk} ${sentence}`
      : sentence;

    // If adding this sentence would exceed max size, finalize current chunk
    if (
      potentialChunk.length > maxChunkSize &&
      currentChunk.length >= minChunkSize
    ) {
      chunks.push(currentChunk.trim());

      // Start new chunk with overlap
      const overlapStart = Math.max(0, sentenceIndex - overlapSentences);
      currentChunk = sentences.slice(overlapStart, sentenceIndex + 1).join(" ");
      sentenceIndex++;
    }
    // If we haven't reached target size, keep adding sentences
    else if (potentialChunk.length < targetChunkSize) {
      currentChunk = potentialChunk;
      sentenceIndex++;
    }
    // We've reached good chunk size, finalize
    else {
      currentChunk = potentialChunk;
      chunks.push(currentChunk.trim());

      // Start new chunk with overlap
      const overlapStart = Math.max(0, sentenceIndex - overlapSentences + 1);
      currentChunk = sentences.slice(overlapStart, sentenceIndex + 1).join(" ");
      sentenceIndex++;
    }
  }

  // Add remaining content as final chunk
  if (currentChunk.trim() && currentChunk.length >= minChunkSize) {
    chunks.push(currentChunk.trim());
  } else if (currentChunk.trim() && chunks.length > 0) {
    // If remaining content is too small, append to last chunk
    chunks[chunks.length - 1] =
      `${chunks[chunks.length - 1]} ${currentChunk.trim()}`;
  } else if (currentChunk.trim()) {
    // If it's the only content, keep it even if small
    chunks.push(currentChunk.trim());
  }

  // Ensure we don't return empty chunks
  return chunks.filter((chunk) => chunk.length >= 50);
}

/**
 * Generate embeddings for multiple text chunks
 */
export async function generateEmbeddings(
  value: string,
): Promise<
  Array<{ embedding: number[]; content: string; chunkIndex: number }>
> {
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
    chunkIndex: index,
  }));
}

/**
 * Generate contextual embeddings with document context
 * Implements Anthropic's "Contextual Retrieval" approach
 */
export async function generateContextualEmbeddings(
  value: string,
  documentContext: {
    title?: string;
    type?: string;
    source?: string;
    summary?: string;
  },
): Promise<
  Array<{
    embedding: number[];
    content: string;
    contextualContent: string;
    chunkIndex: number;
  }>
> {
  const chunks = generateChunks(value);

  if (chunks.length === 0) {
    throw new Error("No valid chunks could be generated from the input text");
  }

  // Create contextual versions of chunks
  const contextualChunks = chunks.map((chunk, index) => {
    let context = "";

    if (documentContext.title) {
      context += `Document: "${documentContext.title}"`;
    }
    if (documentContext.type) {
      context += context
        ? ` (${documentContext.type})`
        : `Type: ${documentContext.type}`;
    }
    if (documentContext.source) {
      context += context
        ? ` from ${documentContext.source}`
        : `Source: ${documentContext.source}`;
    }
    if (documentContext.summary && index === 0) {
      context += context
        ? `. Context: ${documentContext.summary}`
        : `Context: ${documentContext.summary}`;
    }

    // Add position context for longer documents
    if (chunks.length > 1) {
      const position =
        index === 0
          ? "beginning"
          : index === chunks.length - 1
            ? "end"
            : "middle";
      context += context
        ? `. This content is from the ${position} of the document.`
        : `This content is from the ${position} of the document.`;
    }

    return context ? `${context}\n\n${chunk}` : chunk;
  });

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: contextualChunks,
  });

  return embeddings.map((embedding, index) => ({
    content: chunks[index], // Store original chunk without context
    contextualContent: contextualChunks[index], // Store contextualized version
    embedding,
    chunkIndex: index,
  }));
}

/**
 * Generate a single embedding for a query
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const input = query.replace(/\n/g, " ").trim();

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
    case "text/plain":
    case "text/markdown":
    case "application/json":
      return content;
    case "text/html":
      // Basic HTML tag removal
      return content
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    default:
      // For other types, assume it's already text content
      return content;
  }
}

/**
 * Validate if content is suitable for RAG processing
 */
export function validateContentForRAG(
  content: string,
  mimeType: string,
): { isValid: boolean; reason?: string } {
  const extractedText = extractTextFromFile(content, mimeType);

  if (!extractedText || extractedText.trim().length === 0) {
    return { isValid: false, reason: "No text content could be extracted" };
  }

  if (extractedText.length < 10) {
    return {
      isValid: false,
      reason: "Content is too short for meaningful RAG processing",
    };
  }

  const chunks = generateChunks(extractedText);
  if (chunks.length === 0) {
    return {
      isValid: false,
      reason: "No valid chunks could be generated from the content",
    };
  }

  return { isValid: true };
}
