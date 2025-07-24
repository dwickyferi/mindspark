import { describe, expect, test } from "vitest";
import { RAGService } from "./service";
import type { ChunkWithSimilarity } from "app-types/rag";

describe("RAGService", () => {
  const ragService = new RAGService();

  describe("formatContextForRAG", () => {
    test("should return empty string for no chunks", () => {
      const result = ragService.formatContextForRAG([]);
      expect(result).toBe("");
    });

    test("should format file document with metadata", () => {
      const chunks: ChunkWithSimilarity[] = [
        {
          id: "chunk1",
          documentId: "doc1",
          projectId: "proj1",
          content:
            "This is the content from a PDF file about machine learning.",
          embedding: [0.1, 0.2, 0.3],
          chunkIndex: 0,
          metadata: {},
          similarity: 0.8,
          createdAt: new Date(),
          document: {
            name: "ML_Guide.pdf",
            mimeType: "application/pdf",
            documentType: "file",
          },
        },
      ];

      const result = ragService.formatContextForRAG(chunks);

      expect(result).toContain('[Source: PDF Document - "ML_Guide.pdf"]');
      expect(result).toContain("Content:");
      expect(result).toContain(
        "This is the content from a PDF file about machine learning.",
      );
      expect(result).toContain(
        "Based on the following context from your project documents:",
      );
    });

    test("should format YouTube video with metadata", () => {
      const chunks: ChunkWithSimilarity[] = [
        {
          id: "chunk1",
          documentId: "doc1",
          projectId: "proj1",
          content:
            "In this video, we discuss the future of artificial intelligence and its impact on society.",
          embedding: [0.1, 0.2, 0.3],
          chunkIndex: 0,
          metadata: {},
          similarity: 0.9,
          createdAt: new Date(),
          document: {
            name: "The Future of AI - Complete Guide",
            mimeType: "text/plain",
            documentType: "youtube",
          },
        },
      ];

      const result = ragService.formatContextForRAG(chunks);

      expect(result).toContain(
        '[Source: YouTube Video - "The Future of AI - Complete Guide"]',
      );
      expect(result).toContain("Content:");
      expect(result).toContain(
        "In this video, we discuss the future of artificial intelligence",
      );
    });

    test("should format web page with metadata and domain", () => {
      const chunks: ChunkWithSimilarity[] = [
        {
          id: "chunk1",
          documentId: "doc1",
          projectId: "proj1",
          content:
            "This webpage explains the latest trends in web development and best practices.",
          embedding: [0.1, 0.2, 0.3],
          chunkIndex: 0,
          metadata: {},
          similarity: 0.7,
          createdAt: new Date(),
          document: {
            name: "Web Development Trends 2024",
            mimeType: "text/html",
            documentType: "web",
            webTitle: "Latest Web Dev Trends",
            webUrl: "https://example.com/web-dev-trends",
          },
        },
      ];

      const result = ragService.formatContextForRAG(chunks);

      expect(result).toContain(
        '[Source: Web Page - "Latest Web Dev Trends" (example.com)]',
      );
      expect(result).toContain("Content:");
      expect(result).toContain(
        "This webpage explains the latest trends in web development",
      );
    });

    test("should handle multiple chunks with different document types", () => {
      const chunks: ChunkWithSimilarity[] = [
        {
          id: "chunk1",
          documentId: "doc1",
          projectId: "proj1",
          content: "Content from a markdown file.",
          embedding: [0.1, 0.2, 0.3],
          chunkIndex: 0,
          metadata: {},
          similarity: 0.8,
          createdAt: new Date(),
          document: {
            name: "README.md",
            mimeType: "text/markdown",
            documentType: "file",
          },
        },
        {
          id: "chunk2",
          documentId: "doc2",
          projectId: "proj1",
          content: "Transcript from a YouTube video about React.",
          embedding: [0.4, 0.5, 0.6],
          chunkIndex: 0,
          metadata: {},
          similarity: 0.7,
          createdAt: new Date(),
          document: {
            name: "React Tutorial for Beginners",
            mimeType: "text/plain",
            documentType: "youtube",
          },
        },
      ];

      const result = ragService.formatContextForRAG(chunks);

      expect(result).toContain('[Source: Markdown File - "README.md"]');
      expect(result).toContain(
        '[Source: YouTube Video - "React Tutorial for Beginners"]',
      );
      expect(result).toContain("Content from a markdown file.");
      expect(result).toContain("Transcript from a YouTube video about React.");
    });

    test("should handle chunk without document metadata", () => {
      const chunks: ChunkWithSimilarity[] = [
        {
          id: "chunk1",
          documentId: "doc1",
          projectId: "proj1",
          content: "Content without document metadata.",
          embedding: [0.1, 0.2, 0.3],
          chunkIndex: 0,
          metadata: {},
          similarity: 0.8,
          createdAt: new Date(),
        },
      ];

      const result = ragService.formatContextForRAG(chunks);

      expect(result).toContain("Content without document metadata.");
      expect(result).not.toContain("[Source:");
    });
  });

  describe("getFileTypeLabel", () => {
    test("should return correct labels for common MIME types", () => {
      // @ts-expect-error - accessing private method for testing
      expect(ragService.getFileTypeLabel("application/pdf", "test.pdf")).toBe(
        "PDF Document",
      );
      // @ts-expect-error - accessing private method for testing
      expect(ragService.getFileTypeLabel("text/markdown", "README.md")).toBe(
        "Markdown File",
      );
      // @ts-expect-error - accessing private method for testing
      expect(
        ragService.getFileTypeLabel("application/json", "config.json"),
      ).toBe("JSON File");
      // @ts-expect-error - accessing private method for testing
      expect(ragService.getFileTypeLabel("text/csv", "data.csv")).toBe(
        "CSV File",
      );
    });

    test("should fallback to file extension when MIME type is unknown", () => {
      // @ts-expect-error - accessing private method for testing
      expect(
        ragService.getFileTypeLabel("application/unknown", "document.docx"),
      ).toBe("Word Document");
      // @ts-expect-error - accessing private method for testing
      expect(
        ragService.getFileTypeLabel("unknown/type", "spreadsheet.xlsx"),
      ).toBe("Excel Spreadsheet");
    });

    test("should return generic 'File' for unknown types", () => {
      // @ts-expect-error - accessing private method for testing
      expect(ragService.getFileTypeLabel("unknown/type", "unknown.xyz")).toBe(
        "File",
      );
      // @ts-expect-error - accessing private method for testing
      expect(ragService.getFileTypeLabel("", "noextension")).toBe("File");
    });
  });
});
