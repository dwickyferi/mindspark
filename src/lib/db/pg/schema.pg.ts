import { ChatMessage, Project } from "app-types/chat";
import { UserPreferences } from "app-types/user";
import { MCPServerConfig } from "app-types/mcp";
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  json,
  uuid,
  boolean,
  unique,
  varchar,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { DBWorkflow, DBEdge, DBNode } from "app-types/workflow";

export const ChatThreadSchema = pgTable("chat_thread", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  title: text("title").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  projectId: uuid("project_id"),
});

export const ChatMessageSchema = pgTable("chat_message", {
  id: text("id").primaryKey().notNull(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => ChatThreadSchema.id),
  role: text("role").notNull().$type<ChatMessage["role"]>(),
  parts: json("parts").notNull().array(),
  attachments: json("attachments").array(),
  annotations: json("annotations").array(),
  model: text("model"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ProjectSchema = pgTable("project", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id),
  instructions: json("instructions").$type<Project["instructions"]>(),
  selectedDocuments: json("selected_documents").$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const McpServerSchema = pgTable("mcp_server", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  config: json("config").notNull().$type<MCPServerConfig>(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const UserSchema = pgTable("user", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  password: text("password"),
  image: text("image"),
  preferences: json("preferences").default({}).$type<UserPreferences>(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const SessionSchema = pgTable("session", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
});

export const AccountSchema = pgTable("account", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const VerificationSchema = pgTable("verification", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

// Tool customization table for per-user additional AI instructions
export const McpToolCustomizationSchema = pgTable(
  "mcp_server_tool_custom_instructions",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    toolName: text("tool_name").notNull(),
    mcpServerId: uuid("mcp_server_id")
      .notNull()
      .references(() => McpServerSchema.id, { onDelete: "cascade" }),
    prompt: text("prompt"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [unique().on(table.userId, table.toolName, table.mcpServerId)],
);

export const McpServerCustomizationSchema = pgTable(
  "mcp_server_custom_instructions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    mcpServerId: uuid("mcp_server_id")
      .notNull()
      .references(() => McpServerSchema.id, { onDelete: "cascade" }),
    prompt: text("prompt"),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique().on(table.userId, table.mcpServerId)],
);

export const WorkflowSchema = pgTable("workflow", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  version: text("version").notNull().default("0.1.0"),
  name: text("name").notNull(),
  icon: json("icon").$type<DBWorkflow["icon"]>(),
  description: text("description"),
  isPublished: boolean("is_published").notNull().default(false),
  visibility: varchar("visibility", {
    enum: ["public", "private", "readonly"],
  })
    .notNull()
    .default("private"),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const WorkflowNodeDataSchema = pgTable(
  "workflow_node",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    version: text("version").notNull().default("0.1.0"),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => WorkflowSchema.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    uiConfig: json("ui_config").$type<DBNode["uiConfig"]>().default({}),
    nodeConfig: json("node_config")
      .$type<Partial<DBNode["nodeConfig"]>>()
      .default({}),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("workflow_node_kind_idx").on(t.kind)],
);

export const WorkflowEdgeSchema = pgTable("workflow_edge", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  version: text("version").notNull().default("0.1.0"),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => WorkflowSchema.id, { onDelete: "cascade" }),
  source: uuid("source")
    .notNull()
    .references(() => WorkflowNodeDataSchema.id, { onDelete: "cascade" }),
  target: uuid("target")
    .notNull()
    .references(() => WorkflowNodeDataSchema.id, { onDelete: "cascade" }),
  uiConfig: json("ui_config").$type<DBEdge["uiConfig"]>().default({}),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// RAG-related schemas
export const DocumentSchema = pgTable("document", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => ProjectSchema.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  content: text("content").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  metadata: json("metadata").default({}),
  // Document type
  documentType: text("document_type").notNull().default("file"), // "file" | "youtube" | "web"
  // YouTube-specific fields
  youtubeVideoId: text("youtube_video_id"), // YouTube video ID
  youtubeThumbnail: text("youtube_thumbnail"), // Thumbnail URL
  youtubeTitle: text("youtube_title"), // Original video title
  youtubeChannelName: text("youtube_channel_name"), // Channel name
  youtubeDuration: integer("youtube_duration"), // Duration in seconds
  youtubeUrl: text("youtube_url"), // Original YouTube URL
  // Web page-specific fields
  webUrl: text("web_url"), // Original web page URL
  webTitle: text("web_title"), // Extracted page title
  webFavicon: text("web_favicon"), // Favicon URL
  webExtractedAt: timestamp("web_extracted_at"), // When content was extracted
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const DocumentChunkSchema = pgTable(
  "document_chunk",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => DocumentSchema.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => ProjectSchema.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    embedding: text("embedding").array(), // Store as text array for now
    chunkIndex: integer("chunk_index").notNull(),
    metadata: json("metadata").default({}),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("document_chunk_document_id_idx").on(table.documentId),
    index("document_chunk_project_id_idx").on(table.projectId),
  ],
);

// MindSpark Studio - Datasource Management
export const DatasourceSchema = pgTable(
  "datasource",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    name: text("name").notNull(),
    type: text("type").notNull(), // "postgresql" | "mysql" | "sqlite" | "mongodb"
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    connectionConfig: json("connection_config").notNull(), // Encrypted connection details
    isActive: boolean("is_active").notNull().default(true),
    lastConnectionTest: timestamp("last_connection_test"),
    metadata: json("metadata").default({}), // Schema cache, table counts, etc.
    tags: json("tags").$type<string[]>().default([]),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique("datasource_name_user_unique").on(table.userId, table.name),
    index("datasource_user_id_idx").on(table.userId),
    index("datasource_type_idx").on(table.type),
  ],
);

// MindSpark Studio - Charts
export const ChartSchema = pgTable(
  "chart",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    datasourceId: uuid("datasource_id")
      .notNull()
      .references(() => DatasourceSchema.id, { onDelete: "cascade" }),
    sqlQuery: text("sql_query").notNull(),
    chartType: text("chart_type").notNull(), // "bar" | "line" | "pie" | "table" | "scatter" | etc.
    chartConfig: json("chart_config").notNull(), // ECharts configuration
    dataCache: json("data_cache"), // Cached query results for static charts
    dataMode: text("data_mode").notNull().default("static"), // "static" | "realtime"
    refreshInterval: integer("refresh_interval"), // For realtime charts (seconds)
    tags: json("tags").$type<string[]>().default([]),
    isPinned: boolean("is_pinned").notNull().default(false),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("chart_user_id_idx").on(table.userId),
    index("chart_datasource_id_idx").on(table.datasourceId),
    index("chart_type_idx").on(table.chartType),
    index("chart_pinned_idx").on(table.isPinned),
  ],
);

// MindSpark Studio - Dashboards
export const DashboardSchema = pgTable(
  "dashboard",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    layout: json("layout").notNull(), // react-grid-layout configuration
    refreshConfig: json("refresh_config").default({}), // Global refresh settings
    isPublic: boolean("is_public").notNull().default(false),
    tags: json("tags").$type<string[]>().default([]),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("dashboard_user_id_idx").on(table.userId),
    index("dashboard_public_idx").on(table.isPublic),
  ],
);

// MindSpark Studio - Dashboard Charts (Many-to-Many relationship)
export const DashboardChartSchema = pgTable(
  "dashboard_chart",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    dashboardId: uuid("dashboard_id")
      .notNull()
      .references(() => DashboardSchema.id, { onDelete: "cascade" }),
    chartId: uuid("chart_id")
      .notNull()
      .references(() => ChartSchema.id, { onDelete: "cascade" }),
    gridPosition: json("grid_position").notNull(), // { x, y, w, h, minW, minH }
    autoRefreshEnabled: boolean("auto_refresh_enabled").notNull().default(true),
    refreshInterval: integer("refresh_interval").default(60), // seconds
    lastRefresh: timestamp("last_refresh"),
    refreshErrorCount: integer("refresh_error_count").default(0),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique("dashboard_chart_unique").on(table.dashboardId, table.chartId),
    index("dashboard_chart_dashboard_idx").on(table.dashboardId),
    index("dashboard_chart_chart_idx").on(table.chartId),
  ],
);

// MindSpark Studio - Connection Test History
export const DatasourceConnectionTestSchema = pgTable(
  "datasource_connection_test",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    datasourceId: uuid("datasource_id")
      .notNull()
      .references(() => DatasourceSchema.id, { onDelete: "cascade" }),
    success: boolean("success").notNull(),
    errorMessage: text("error_message"),
    responseTime: integer("response_time"), // milliseconds
    metadata: json("metadata").default({}), // Additional test details
    testedAt: timestamp("tested_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("connection_test_datasource_idx").on(table.datasourceId),
    index("connection_test_success_idx").on(table.success),
  ],
);

// MindSpark Studio - Chart Generation History (for AI interactions)
export const ChartGenerationHistorySchema = pgTable(
  "chart_generation_history",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    datasourceId: uuid("datasource_id")
      .notNull()
      .references(() => DatasourceSchema.id, { onDelete: "cascade" }),
    originalQuery: text("original_query").notNull(), // User's natural language query
    selectedTables: json("selected_tables").$type<string[]>().notNull(),
    generatedSQL: text("generated_sql").notNull(),
    sqlSuccess: boolean("sql_success").notNull(),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0),
    finalChartId: uuid("final_chart_id").references(() => ChartSchema.id),
    aiProvider: text("ai_provider").notNull(), // "openai" | "anthropic" | "ollama"
    aiModel: text("ai_model").notNull(),
    executionTime: integer("execution_time"), // milliseconds
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("chart_generation_user_idx").on(table.userId),
    index("chart_generation_datasource_idx").on(table.datasourceId),
    index("chart_generation_success_idx").on(table.sqlSuccess),
  ],
);

export type McpServerEntity = typeof McpServerSchema.$inferSelect;
export type ChatThreadEntity = typeof ChatThreadSchema.$inferSelect;
export type ChatMessageEntity = typeof ChatMessageSchema.$inferSelect;
export type ProjectEntity = typeof ProjectSchema.$inferSelect;
export type UserEntity = typeof UserSchema.$inferSelect;
export type ToolCustomizationEntity =
  typeof McpToolCustomizationSchema.$inferSelect;
export type McpServerCustomizationEntity =
  typeof McpServerCustomizationSchema.$inferSelect;
export type DocumentEntity = typeof DocumentSchema.$inferSelect;
export type DocumentChunkEntity = typeof DocumentChunkSchema.$inferSelect;

// MindSpark Studio Types
export type DatasourceEntity = typeof DatasourceSchema.$inferSelect;
export type ChartEntity = typeof ChartSchema.$inferSelect;
export type DashboardEntity = typeof DashboardSchema.$inferSelect;
export type DashboardChartEntity = typeof DashboardChartSchema.$inferSelect;
export type DatasourceConnectionTestEntity =
  typeof DatasourceConnectionTestSchema.$inferSelect;
export type ChartGenerationHistoryEntity =
  typeof ChartGenerationHistorySchema.$inferSelect;
