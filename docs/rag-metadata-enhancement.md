# RAG Document Metadata Enhancement

This document demonstrates the enhanced RAG (Retrieval-Augmented Generation) system that now includes rich document metadata in the context prompt, enabling better AI understanding and more precise referencing of knowledge sources.

## Overview

The RAG system now automatically attaches metadata to each document context, making it clear to the AI model what type of source the information comes from. This enables the AI to:

- Distinguish between different types of knowledge sources
- Provide more accurate and contextual responses
- Handle ambiguous queries like "summarize this video" or "what does this document say"

## Metadata Format Examples

### 1. File Documents

For regular file uploads (PDF, Word, text files, etc.), the system shows:

```
[Source: PDF Document - "Machine_Learning_Guide.pdf"]
Content:
Machine learning is a subset of artificial intelligence that enables computers
to learn and make decisions from data without being explicitly programmed...
```

Supported file types with automatic detection:

- **PDF Document** (`.pdf`)
- **Word Document** (`.doc`, `.docx`)
- **Excel Spreadsheet** (`.xls`, `.xlsx`)
- **PowerPoint Presentation** (`.ppt`, `.pptx`)
- **Text File** (`.txt`)
- **Markdown File** (`.md`)
- **HTML File** (`.html`, `.htm`)
- **CSV File** (`.csv`)
- **JSON File** (`.json`)
- **XML File** (`.xml`)

### 2. YouTube Videos

For YouTube video transcripts, the system shows:

```
[Source: YouTube Video - "The Future of AI - Complete Guide"]
Content:
In this comprehensive video, we explore the latest developments in artificial
intelligence and discuss how AI will shape our future...
```

### 3. Web Pages

For web page content, the system shows:

```
[Source: Web Page - "Latest Web Development Trends" (example.com)]
Content:
This article covers the most important web development trends for 2024,
including new frameworks, tools, and best practices...
```

## System Prompt Enhancement

The RAG system prompt has been updated to provide clear instructions on how to handle the metadata-rich context:

- **Source Recognition**: The AI can identify and reference specific sources by type and name
- **Contextual Responses**: When users ask about "this video" or "this document," the AI refers to the metadata to understand which content is being referenced
- **Accurate Attribution**: The AI can properly attribute information to specific sources

## User Experience Benefits

### Before Enhancement

```
User: "Summarize this video"
AI: "I don't see any specific video content. Could you clarify which video you're referring to?"
```

### After Enhancement

```
User: "Summarize this video"
AI: "Based on the YouTube video 'The Future of AI - Complete Guide', here's a summary: The video explores..."
```

### Enhanced Referencing

```
User: "What does the PDF say about machine learning?"
AI: "According to the PDF document 'Machine_Learning_Guide.pdf', machine learning is defined as..."
```

## Technical Implementation

### 1. Enhanced Context Formatting

The `formatContextForRAG` method in `RAGService` now creates rich metadata headers:

```typescript
// Example output format
[Source: YouTube Video - "Video Title"]
Content:
Actual content chunks from the video transcript...

[Source: PDF Document - "Document.pdf"]
Content:
Extracted text content from the PDF file...
```

### 2. File Type Detection

The system uses a two-tier approach for file type detection:

1. **MIME Type Mapping**: First attempts to identify file type from MIME type
2. **Extension Fallback**: Falls back to file extension if MIME type is unknown
3. **Generic Fallback**: Uses "File" as a generic label if both fail

### 3. Web Page Metadata

For web pages, the system extracts:

- Page title (from `webTitle` field)
- Domain name (extracted from URL)
- Original URL for reference

## Migration and Backward Compatibility

The enhancement maintains full backward compatibility:

- **Existing Documents**: Work seamlessly with the new system
- **Legacy Format**: Documents without metadata still function normally
- **Graceful Degradation**: Missing metadata fields are handled gracefully

## Testing

Comprehensive test coverage ensures:

- Correct metadata formatting for all document types
- Proper handling of missing metadata
- File type detection accuracy
- Multiple document context formatting

## Future Enhancements

Potential future improvements:

1. **Custom Metadata**: Allow users to add custom tags or descriptions
2. **Content Previews**: Include small previews or summaries in metadata
3. **Source Confidence**: Add confidence scores for content relevance
4. **Timestamp Information**: Include creation/modification dates in context
5. **Content Categories**: Automatic categorization of document content

## Example Usage Scenarios

### Scenario 1: Mixed Content Project

A project with:

- Research papers (PDF)
- Tutorial videos (YouTube)
- Documentation websites (Web pages)

The AI can now clearly distinguish and reference each type:

- "According to the research paper 'AI_Ethics.pdf'..."
- "In the tutorial video 'React Basics'..."
- "The documentation on reactjs.org explains..."

### Scenario 2: Educational Content

A learning project with course materials:

- "Based on the lecture video 'Linear Algebra Fundamentals'..."
- "The textbook chapter 'matrix_operations.pdf' states..."
- "According to the course website exercises..."

### Scenario 3: Business Intelligence

A business analysis project:

- "The quarterly report 'Q3_2024_Results.xlsx' shows..."
- "In the strategy presentation 'Growth_Plan.pptx'..."
- "The market research from 'industry-report-2024' indicates..."

This enhanced metadata system significantly improves the AI's ability to provide contextual, accurate, and well-attributed responses based on the user's knowledge base.
