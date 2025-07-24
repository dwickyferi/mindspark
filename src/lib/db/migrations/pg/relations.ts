import { relations } from "drizzle-orm/relations";
import { user, project, chatThread, chatMessage, account, session, mcpServerCustomInstructions, mcpServer, mcpServerToolCustomInstructions, workflow, workflowEdge, workflowNode, document, documentChunk, departments, employees, sales } from "./schema";

export const projectRelations = relations(project, ({one, many}) => ({
	user: one(user, {
		fields: [project.userId],
		references: [user.id]
	}),
	documentChunks: many(documentChunk),
	documents: many(document),
}));

export const userRelations = relations(user, ({many}) => ({
	projects: many(project),
	chatThreads: many(chatThread),
	accounts: many(account),
	sessions: many(session),
	mcpServerCustomInstructions: many(mcpServerCustomInstructions),
	mcpServerToolCustomInstructions: many(mcpServerToolCustomInstructions),
	workflows: many(workflow),
	documents: many(document),
}));

export const chatThreadRelations = relations(chatThread, ({one, many}) => ({
	user: one(user, {
		fields: [chatThread.userId],
		references: [user.id]
	}),
	chatMessages: many(chatMessage),
}));

export const chatMessageRelations = relations(chatMessage, ({one}) => ({
	chatThread: one(chatThread, {
		fields: [chatMessage.threadId],
		references: [chatThread.id]
	}),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const mcpServerCustomInstructionsRelations = relations(mcpServerCustomInstructions, ({one}) => ({
	user: one(user, {
		fields: [mcpServerCustomInstructions.userId],
		references: [user.id]
	}),
	mcpServer: one(mcpServer, {
		fields: [mcpServerCustomInstructions.mcpServerId],
		references: [mcpServer.id]
	}),
}));

export const mcpServerRelations = relations(mcpServer, ({many}) => ({
	mcpServerCustomInstructions: many(mcpServerCustomInstructions),
	mcpServerToolCustomInstructions: many(mcpServerToolCustomInstructions),
}));

export const mcpServerToolCustomInstructionsRelations = relations(mcpServerToolCustomInstructions, ({one}) => ({
	user: one(user, {
		fields: [mcpServerToolCustomInstructions.userId],
		references: [user.id]
	}),
	mcpServer: one(mcpServer, {
		fields: [mcpServerToolCustomInstructions.mcpServerId],
		references: [mcpServer.id]
	}),
}));

export const workflowRelations = relations(workflow, ({one, many}) => ({
	user: one(user, {
		fields: [workflow.userId],
		references: [user.id]
	}),
	workflowEdges: many(workflowEdge),
	workflowNodes: many(workflowNode),
}));

export const workflowEdgeRelations = relations(workflowEdge, ({one}) => ({
	workflow: one(workflow, {
		fields: [workflowEdge.workflowId],
		references: [workflow.id]
	}),
	workflowNode_source: one(workflowNode, {
		fields: [workflowEdge.source],
		references: [workflowNode.id],
		relationName: "workflowEdge_source_workflowNode_id"
	}),
	workflowNode_target: one(workflowNode, {
		fields: [workflowEdge.target],
		references: [workflowNode.id],
		relationName: "workflowEdge_target_workflowNode_id"
	}),
}));

export const workflowNodeRelations = relations(workflowNode, ({one, many}) => ({
	workflowEdges_source: many(workflowEdge, {
		relationName: "workflowEdge_source_workflowNode_id"
	}),
	workflowEdges_target: many(workflowEdge, {
		relationName: "workflowEdge_target_workflowNode_id"
	}),
	workflow: one(workflow, {
		fields: [workflowNode.workflowId],
		references: [workflow.id]
	}),
}));

export const documentChunkRelations = relations(documentChunk, ({one}) => ({
	document: one(document, {
		fields: [documentChunk.documentId],
		references: [document.id]
	}),
	project: one(project, {
		fields: [documentChunk.projectId],
		references: [project.id]
	}),
}));

export const documentRelations = relations(document, ({one, many}) => ({
	documentChunks: many(documentChunk),
	project: one(project, {
		fields: [document.projectId],
		references: [project.id]
	}),
	user: one(user, {
		fields: [document.userId],
		references: [user.id]
	}),
}));

export const employeesRelations = relations(employees, ({one, many}) => ({
	department: one(departments, {
		fields: [employees.departmentId],
		references: [departments.id]
	}),
	sales: many(sales),
}));

export const departmentsRelations = relations(departments, ({many}) => ({
	employees: many(employees),
}));

export const salesRelations = relations(sales, ({one}) => ({
	employee: one(employees, {
		fields: [sales.employeeId],
		references: [employees.id]
	}),
}));