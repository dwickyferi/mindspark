import { pgTable, foreignKey, uuid, text, json, timestamp, unique, boolean, varchar, index, integer, serial, numeric, date } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const project = pgTable("project", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	userId: uuid("user_id").notNull(),
	instructions: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	selectedDocuments: json("selected_documents").default([]),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "project_user_id_user_id_fk"
		}),
]);

export const chatThread = pgTable("chat_thread", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	projectId: uuid("project_id"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "chat_thread_user_id_user_id_fk"
		}),
]);

export const chatMessage = pgTable("chat_message", {
	id: text().primaryKey().notNull(),
	threadId: uuid("thread_id").notNull(),
	role: text().notNull(),
	parts: json().array(),
	attachments: json().array(),
	annotations: json().array(),
	model: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.threadId],
			foreignColumns: [chatThread.id],
			name: "chat_message_thread_id_chat_thread_id_fk"
		}),
]);

export const verification = pgTable("verification", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
});

export const user = pgTable("user", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	password: text(),
	image: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	preferences: json().default({}),
	emailVerified: boolean("email_verified").default(false).notNull(),
}, (table) => [
	unique("user_email_unique").on(table.email),
]);

export const account = pgTable("account", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: uuid("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const session = pgTable("session", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: uuid("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const mcpServerCustomInstructions = pgTable("mcp_server_custom_instructions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	mcpServerId: uuid("mcp_server_id").notNull(),
	prompt: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "mcp_server_custom_instructions_user_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.mcpServerId],
			foreignColumns: [mcpServer.id],
			name: "mcp_server_custom_instructions_mcp_server_id_mcp_server_id_fk"
		}).onDelete("cascade"),
	unique("mcp_server_custom_instructions_user_id_mcp_server_id_unique").on(table.userId, table.mcpServerId),
]);

export const mcpServer = pgTable("mcp_server", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	config: json().notNull(),
	enabled: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const mcpServerToolCustomInstructions = pgTable("mcp_server_tool_custom_instructions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	toolName: text("tool_name").notNull(),
	mcpServerId: uuid("mcp_server_id").notNull(),
	prompt: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "mcp_server_tool_custom_instructions_user_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.mcpServerId],
			foreignColumns: [mcpServer.id],
			name: "mcp_server_tool_custom_instructions_mcp_server_id_mcp_server_id"
		}).onDelete("cascade"),
	unique("mcp_server_tool_custom_instructions_user_id_tool_name_mcp_serve").on(table.userId, table.toolName, table.mcpServerId),
]);

export const workflow = pgTable("workflow", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	version: text().default('0.1.0').notNull(),
	name: text().notNull(),
	icon: json(),
	description: text(),
	isPublished: boolean("is_published").default(false).notNull(),
	visibility: varchar().default('private').notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "workflow_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const workflowEdge = pgTable("workflow_edge", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	version: text().default('0.1.0').notNull(),
	workflowId: uuid("workflow_id").notNull(),
	source: uuid().notNull(),
	target: uuid().notNull(),
	uiConfig: json("ui_config").default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflow.id],
			name: "workflow_edge_workflow_id_workflow_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.source],
			foreignColumns: [workflowNode.id],
			name: "workflow_edge_source_workflow_node_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.target],
			foreignColumns: [workflowNode.id],
			name: "workflow_edge_target_workflow_node_id_fk"
		}).onDelete("cascade"),
]);

export const workflowNode = pgTable("workflow_node", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	version: text().default('0.1.0').notNull(),
	workflowId: uuid("workflow_id").notNull(),
	kind: text().notNull(),
	name: text().notNull(),
	description: text(),
	uiConfig: json("ui_config").default({}),
	nodeConfig: json("node_config").default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("workflow_node_kind_idx").using("btree", table.kind.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflow.id],
			name: "workflow_node_workflow_id_workflow_id_fk"
		}).onDelete("cascade"),
]);

export const documentChunk = pgTable("document_chunk", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	documentId: uuid("document_id").notNull(),
	projectId: uuid("project_id").notNull(),
	content: text().notNull(),
	embedding: text().array(),
	chunkIndex: integer("chunk_index").notNull(),
	metadata: json().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("document_chunk_document_id_idx").using("btree", table.documentId.asc().nullsLast().op("uuid_ops")),
	index("document_chunk_project_id_idx").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [document.id],
			name: "document_chunk_document_id_document_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [project.id],
			name: "document_chunk_project_id_project_id_fk"
		}).onDelete("cascade"),
]);

export const document = pgTable("document", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	content: text().notNull(),
	mimeType: text("mime_type").notNull(),
	size: integer().notNull(),
	metadata: json().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	isSelectedForRag: boolean("is_selected_for_rag").default(true).notNull(),
	documentType: text("document_type").default('file').notNull(),
	youtubeVideoId: text("youtube_video_id"),
	youtubeThumbnail: text("youtube_thumbnail"),
	youtubeTitle: text("youtube_title"),
	youtubeChannelName: text("youtube_channel_name"),
	youtubeDuration: integer("youtube_duration"),
	youtubeUrl: text("youtube_url"),
	webUrl: text("web_url"),
	webTitle: text("web_title"),
	webFavicon: text("web_favicon"),
	webImages: json("web_images"),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [project.id],
			name: "document_project_id_project_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "document_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const departments = pgTable("departments", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	budget: numeric({ precision: 10, scale:  2 }),
});

export const employees = pgTable("employees", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	departmentId: integer("department_id"),
	salary: numeric({ precision: 10, scale:  2 }),
	hireDate: date("hire_date"),
}, (table) => [
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.id],
			name: "employees_department_id_fkey"
		}),
]);

export const sales = pgTable("sales", {
	id: serial().primaryKey().notNull(),
	employeeId: integer("employee_id"),
	amount: numeric({ precision: 10, scale:  2 }),
	saleDate: date("sale_date"),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [employees.id],
			name: "sales_employee_id_fkey"
		}),
]);
