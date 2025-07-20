# Knowledge AI Explorer - System Requirements

## 1. Overview

Knowledge AI Explorer adalah fitur yang memungkinkan user untuk menambahkan berbagai jenis dokumen, file, dan konten YouTube sebagai knowledge base untuk chatbot. Fitur ini menggunakan RAG (Retrieval Augmented Generation) dengan library Agno dan FastAPI sebagai backend processing engine.

## 2. Core Features

### 2.1 Knowledge Management System

- **Personal Knowledge**: Knowledge base pribadi untuk setiap user
- **Organization Knowledge**: Knowledge base yang dapat diakses oleh seluruh anggota organisasi
- **Permission Management**: Role-based access control untuk knowledge sharing
- **Version Control**: Tracking perubahan pada knowledge base

### 2.2 Supported Knowledge Types

Berdasarkan library Agno, sistem akan mendukung:

#### Document Types:

- **PDF**: Local files dan PDF URLs
- **DOCX**: Microsoft Word documents
- **TXT**: Plain text files
- **JSON**: Structured data files
- **CSV**: Tabular data
- **Markdown**: .md files

#### Web Content:

- **YouTube Videos**: Transcript extraction dan processing
- **Web Pages**: Crawling dan extraction
- **URLs**: Direct content fetching

#### Advanced Types:

- **ArXiv Papers**: Academic research papers
- **Wikipedia Pages**: Encyclopedia content
- **News Articles**: Current events dan information

## 3. Technical Architecture

### 3.1 Recommended Tech Stack

#### Frontend (Next.js)

```
- Next.js 15+ (App Router)
- TypeScript
- Tailwind CSS
- Radix UI / shadcn/ui
- React Query / TanStack Query
- Zustand (State Management)
- React Hook Form + Zod
- Lucide React (Icons)
```

#### Backend (FastAPI)

```
- FastAPI 0.110+
- Agno 1.1.1+
- Pydantic v2
- SQLAlchemy 2.0
- Alembic (Migrations)
- Celery (Background Tasks)
- Redis (Cache & Queue)
- PostgreSQL (Primary DB)
```

#### Vector Database Options

```
- LanceDB (Recommended - High Performance)
- ChromaDB (Alternative)
- Qdrant (Scalable Option)
- PGVector (PostgreSQL Extension)
```

#### Infrastructure

```
- Docker & Docker Compose
- nginx (Reverse Proxy)
- AWS S3 / MinIO (File Storage)
- CloudFront (CDN)
- AWS ECS / Kubernetes (Production)
```

### 3.2 Database Schema

#### Core Tables

```sql
-- Users table (existing)
users (
    id, email, name, created_at, updated_at
)

-- Organizations table (existing)
organizations (
    id, name, slug, created_at, updated_at
)

-- Knowledge Base table
knowledge_bases (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('personal', 'organization'),
    owner_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    status ENUM('processing', 'ready', 'failed', 'archived'),
    metadata JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)

-- Knowledge Items table
knowledge_items (
    id UUID PRIMARY KEY,
    knowledge_base_id UUID REFERENCES knowledge_bases(id),
    title VARCHAR(500) NOT NULL,
    source_type ENUM('pdf', 'docx', 'txt', 'json', 'csv', 'youtube', 'web', 'arxiv'),
    source_url TEXT,
    file_path TEXT,
    thumbnail_url TEXT,
    content_hash VARCHAR(64),
    chunk_count INTEGER DEFAULT 0,
    processing_status ENUM('pending', 'processing', 'completed', 'failed'),
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)

-- Chat Sessions with Knowledge
chat_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    knowledge_base_ids UUID[] DEFAULT '{}',
    title VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)

-- Permission Management
knowledge_permissions (
    id UUID PRIMARY KEY,
    knowledge_base_id UUID REFERENCES knowledge_bases(id),
    user_id UUID REFERENCES users(id),
    permission ENUM('read', 'write', 'admin'),
    granted_by UUID REFERENCES users(id),
    created_at TIMESTAMP
)
```

## 4. API Specifications

### 4.1 FastAPI Endpoints

#### Knowledge Base Management

```python
# CRUD Operations
POST   /api/v1/knowledge-bases/              # Create knowledge base
GET    /api/v1/knowledge-bases/              # List knowledge bases
GET    /api/v1/knowledge-bases/{id}          # Get specific knowledge base
PUT    /api/v1/knowledge-bases/{id}          # Update knowledge base
DELETE /api/v1/knowledge-bases/{id}          # Delete knowledge base

# Knowledge Items
POST   /api/v1/knowledge-bases/{id}/items/   # Add knowledge item
GET    /api/v1/knowledge-bases/{id}/items/   # List knowledge items
DELETE /api/v1/knowledge-items/{id}          # Delete knowledge item

# File Upload
POST   /api/v1/knowledge-bases/{id}/upload/  # Upload documents
POST   /api/v1/knowledge-bases/{id}/youtube/ # Add YouTube video
POST   /api/v1/knowledge-bases/{id}/web/     # Add web content

# RAG Operations
POST   /api/v1/knowledge-bases/{id}/query/   # Query knowledge base
POST   /api/v1/chat/knowledge/               # Chat with knowledge context

# Processing Status
GET    /api/v1/knowledge-items/{id}/status/  # Check processing status
```

#### Permission Management

```python
POST   /api/v1/knowledge-bases/{id}/permissions/     # Grant permission
GET    /api/v1/knowledge-bases/{id}/permissions/     # List permissions
DELETE /api/v1/knowledge-bases/{id}/permissions/{user_id} # Revoke permission
```

### 4.2 Agno Integration

#### Knowledge Processing Pipeline

```python
from agno import Agent
from agno.knowledge import PDFKnowledgeBase, YouTubeKnowledgeBase
from agno.vectordb import LanceDB

class KnowledgeProcessor:
    def __init__(self):
        self.vector_db = LanceDB(
            uri="./data/vector_db",
            table_name="knowledge_embeddings"
        )
        self.agent = Agent(
            knowledge=self.vector_db,
            model="gpt-4o-mini"  # or other supported models
        )

    async def process_pdf(self, file_path: str, kb_id: str):
        kb = PDFKnowledgeBase(
            path=file_path,
            vector_db=self.vector_db,
            reader_kwargs={"chunk_size": 1000}
        )
        return await kb.load()

    async def process_youtube(self, url: str, kb_id: str):
        kb = YouTubeKnowledgeBase(
            urls=[url],
            vector_db=self.vector_db
        )
        return await kb.load()

    async def query_knowledge(self, query: str, kb_ids: list):
        response = await self.agent.run(
            query,
            knowledge_filter={"kb_id": {"$in": kb_ids}}
        )
        return response
```

## 5. Frontend Implementation

### 5.1 Page Structure

#### Knowledge Explorer Dashboard (`/knowledge`)

```typescript
interface KnowledgeExplorerProps {
  userType: 'personal' | 'organization';
  organizationId?: string;
}

// Components:
- KnowledgeGrid (thumbnail view)
- KnowledgeFilters (type, status, date)
- UploadZone (drag & drop)
- SearchBar
- BulkActions
```

#### Knowledge Management Page (`/knowledge/manage`)

```typescript
// Features:
- CRUD operations
- Permission settings
- Processing status
- Analytics dashboard
- Bulk operations
```

#### Chat with Knowledge (`/chat/knowledge`)

```typescript
// Features:
- Knowledge base selector
- Multi-KB chat
- Source citations
- Real-time suggestions
```

### 5.2 UI Components

#### Knowledge Item Card

```typescript
interface KnowledgeItemProps {
  item: KnowledgeItem;
  type: 'thumbnail' | 'list';
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

// Display elements:
- Thumbnail (YouTube) / Icon (Documents)
- Title & Description
- Source type badge
- Processing status
- Action buttons
- Metadata (size, date, chunks)
```

## 6. File Processing Pipeline

### 6.1 Upload Flow

```
1. Client uploads file -> Pre-signed S3 URL
2. File validation (size, type, virus scan)
3. Save metadata to PostgreSQL
4. Queue processing job (Celery)
5. Agno processes file -> Vector embeddings
6. Update status & chunk count
7. Notify client via WebSocket
```

### 6.2 Supported Processing

- **Documents**: Text extraction, chunking, embedding generation
- **YouTube**: Transcript extraction, subtitle processing, metadata extraction
- **Web Pages**: Content crawling, cleaning, structured extraction
- **Images**: OCR processing (if needed)

## 7. Security & Performance

### 7.1 Security Measures

- File type validation & virus scanning
- Content-based access control
- Rate limiting for uploads
- Encryption at rest (S3)
- Audit logging

### 7.2 Performance Optimization

- Async processing with Celery
- Caching with Redis
- CDN for file delivery
- Database indexing
- Pagination for large datasets

## 8. Monitoring & Analytics

### 8.1 Metrics to Track

- Knowledge base usage statistics
- Query performance metrics
- Processing success/failure rates
- Storage utilization
- User engagement metrics

### 8.2 Logging

- Processing pipeline logs
- Query logs with performance metrics
- Error tracking with Sentry
- Audit logs for compliance

## 9. Deployment Strategy

### 9.1 Development Environment

```yaml
# docker-compose.dev.yml
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]

  backend:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [postgres, redis]

  postgres:
    image: pgvector/pgvector:pg16

  redis:
    image: redis:7-alpine

  celery:
    build: ./backend
    command: celery worker
```

### 9.2 Production Deployment

- AWS ECS with Fargate
- RDS PostgreSQL with PGVector
- ElastiCache Redis cluster
- S3 for file storage
- CloudFront CDN
- Application Load Balancer

## 10. Migration Plan

### 10.1 Phase 1: Core Infrastructure

- Database schema setup
- Basic CRUD APIs
- File upload functionality
- Agno integration

### 10.2 Phase 2: Knowledge Processing

- Document processing pipeline
- YouTube integration
- Vector search implementation
- Basic UI components

### 10.3 Phase 3: Advanced Features

- Permission management
- Organization sharing
- Chat with knowledge
- Analytics dashboard

### 10.4 Phase 4: Production Optimization

- Performance tuning
- Monitoring setup
- Security hardening
- User training

## 11. Estimated Timeline

- **Phase 1**: 3-4 weeks
- **Phase 2**: 4-5 weeks
- **Phase 3**: 3-4 weeks
- **Phase 4**: 2-3 weeks
- **Total**: 12-16 weeks

## 12. Questions for Clarification

1. **User Limits**: Berapa maksimal storage per user/organization?
2. **File Size**: Berapa maksimal ukuran file yang diizinkan?
3. **Vector Database**: Preferensi vector database untuk production?
4. **Authentication**: Apakah sudah ada sistem auth yang existing?
5. **Billing**: Apakah perlu tracking usage untuk billing purposes?
6. **Multi-language**: Apakah perlu mendukung dokumen multi-bahasa?
7. **Real-time**: Apakah perlu real-time collaboration features?

## 13. Risk Mitigation

### 13.1 Technical Risks

- **Large file processing**: Implement chunking & streaming
- **Vector DB performance**: Proper indexing & caching
- **Storage costs**: Implement lifecycle policies

### 13.2 Business Risks

- **User adoption**: Intuitive UI/UX design
- **Data privacy**: Compliance with regulations
- **Scalability**: Cloud-native architecture

---

_This system requirements document provides a comprehensive foundation for implementing the Knowledge AI Explorer feature. Please review and provide feedback on any areas that need clarification or modification._
