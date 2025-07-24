import { z } from "zod";

export type DocumentType = "file" | "youtube" | "web";

export type Document = {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  content: string;
  mimeType: string;
  size: number;
  metadata: Record<string, any>;
  // YouTube-specific fields
  documentType: DocumentType;
  youtubeVideoId?: string;
  youtubeThumbnail?: string;
  youtubeTitle?: string;
  youtubeChannelName?: string;
  youtubeDuration?: number;
  youtubeUrl?: string;
  // Web page-specific fields
  webUrl?: string;
  webTitle?: string;
  webFavicon?: string;
  webExtractedAt?: Date;
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
  documentType?: DocumentType;
  // YouTube-specific fields
  youtubeVideoId?: string;
  youtubeThumbnail?: string;
  youtubeTitle?: string;
  youtubeChannelName?: string;
  youtubeDuration?: number;
  youtubeUrl?: string;
  // Web page-specific fields
  webUrl?: string;
  webTitle?: string;
  webFavicon?: string;
  webExtractedAt?: Date;
};

export type YouTubeVideoInfo = {
  videoId: string;
  title: string;
  channelName: string;
  thumbnail: string;
  duration: number;
  url: string;
};

export type ChunkWithSimilarity = DocumentChunk & {
  similarity: number;
  document?: Pick<
    Document,
    | "name"
    | "mimeType"
    | "documentType"
    | "youtubeThumbnail"
    | "webUrl"
    | "webTitle"
    | "webFavicon"
  >;
};

export const DocumentUploadSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  content: z.string().min(1, "Document content cannot be empty"),
  mimeType: z.string().min(1, "MIME type is required"),
  size: z.number().positive("File size must be positive"),
  documentType: z.enum(["file", "youtube", "web"]).optional().default("file"),
  // YouTube-specific fields
  youtubeVideoId: z.string().optional(),
  youtubeThumbnail: z.string().url().optional(),
  youtubeTitle: z.string().optional(),
  youtubeChannelName: z.string().optional(),
  youtubeDuration: z.number().positive().optional(),
  youtubeUrl: z.string().url().optional(),
  // Web page-specific fields
  webUrl: z.string().url().optional(),
  webTitle: z.string().optional(),
  webFavicon: z.string().url().optional(),
  webExtractedAt: z.date().optional(),
});

export const WebPageUploadSchema = z.object({
  url: z.string().url("Please enter a valid website URL"),
});

export const YouTubeUploadSchema = z.object({
  url: z.string().url("Please enter a valid YouTube URL"),
});

export interface RAGRepository {
  // Document operations
  createDocument(
    projectId: string,
    userId: string,
    document: DocumentUpload,
  ): Promise<Document>;
  getDocumentsByProjectId(projectId: string): Promise<Document[]>;
  getDocumentById(id: string): Promise<Document | null>;
  deleteDocument(id: string): Promise<void>;
  updateDocument(
    id: string,
    updates: Partial<Pick<Document, "name" | "content" | "metadata">>,
  ): Promise<Document>;

  // Chunk operations
  createChunks(
    chunks: Array<Omit<DocumentChunk, "id" | "createdAt">>,
  ): Promise<DocumentChunk[]>;
  deleteChunksByDocumentId(documentId: string): Promise<void>;
  searchSimilarChunks(
    projectId: string,
    queryEmbedding: number[],
    limit?: number,
    threshold?: number,
    selectedDocumentIds?: string[],
  ): Promise<ChunkWithSimilarity[]>;
  getAllChunksFromDocuments(
    projectId: string,
    selectedDocumentIds: string[],
  ): Promise<ChunkWithSimilarity[]>;
  getChunksByDocumentId(documentId: string): Promise<DocumentChunk[]>;
}
