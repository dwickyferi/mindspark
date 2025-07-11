import { pgTable, uuid, varchar, foreignKey, timestamp, text, boolean, json, unique, primaryKey } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"




export const user = pgTable("User", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 64 }).notNull(),
	password: varchar({ length: 64 }),
	name: varchar({ length: 100 }),
});

export const suggestion = pgTable("Suggestion", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	documentId: uuid().notNull(),
	documentCreatedAt: timestamp({ mode: 'string' }).notNull(),
	originalText: text().notNull(),
	suggestedText: text().notNull(),
	description: text(),
	isResolved: boolean().default(false).notNull(),
	userId: uuid().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
},
(table) => {
	return {
		suggestionUserIdUserIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Suggestion_userId_User_id_fk"
		}),
		suggestionDocumentIdDocumentCreatedAtDocumentIdCreatedAtF: foreignKey({
			columns: [table.documentId, table.documentCreatedAt],
			foreignColumns: [document.id, document.createdAt],
			name: "Suggestion_documentId_documentCreatedAt_Document_id_createdAt_f"
		}),
	}
});

export const message = pgTable("Message", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	chatId: uuid().notNull(),
	role: varchar().notNull(),
	content: json().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
},
(table) => {
	return {
		messageChatIdChatIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
			name: "Message_chatId_Chat_id_fk"
		}),
	}
});

export const chat = pgTable("Chat", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
	userId: uuid().notNull(),
	title: text().notNull(),
	visibility: varchar().default('private').notNull(),
},
(table) => {
	return {
		chatUserIdUserIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Chat_userId_User_id_fk"
		}),
	}
});

export const messageV2 = pgTable("Message_v2", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	chatId: uuid().notNull(),
	role: varchar().notNull(),
	parts: json().notNull(),
	attachments: json().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
},
(table) => {
	return {
		messageV2ChatIdChatIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
			name: "Message_v2_chatId_Chat_id_fk"
		}),
	}
});

export const stream = pgTable("Stream", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	chatId: uuid().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
},
(table) => {
	return {
		streamChatIdChatIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
			name: "Stream_chatId_Chat_id_fk"
		}),
	}
});

export const organization = pgTable("Organization", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	ownerId: uuid().notNull(),
},
(table) => {
	return {
		organizationOwnerIdUserIdFk: foreignKey({
			columns: [table.ownerId],
			foreignColumns: [user.id],
			name: "Organization_ownerId_User_id_fk"
		}),
		organizationNameUnique: unique("Organization_name_unique").on(table.name),
	}
});

export const organizationChat = pgTable("OrganizationChat", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
	title: text().notNull(),
	userId: uuid().notNull(),
	organizationId: uuid().notNull(),
	visibility: varchar().default('organization').notNull(),
},
(table) => {
	return {
		organizationChatUserIdUserIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "OrganizationChat_userId_User_id_fk"
		}),
		organizationChatOrganizationIdOrganizationIdFk: foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "OrganizationChat_organizationId_Organization_id_fk"
		}).onDelete("cascade"),
	}
});

export const organizationInvitation = pgTable("OrganizationInvitation", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid().notNull(),
	email: varchar({ length: 255 }).notNull(),
	role: varchar().default('member').notNull(),
	token: varchar({ length: 255 }).notNull(),
	invitedBy: uuid().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	acceptedAt: timestamp({ mode: 'string' }),
	rejectedAt: timestamp({ mode: 'string' }),
},
(table) => {
	return {
		organizationInvitationOrganizationIdOrganizationIdFk: foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "OrganizationInvitation_organizationId_Organization_id_fk"
		}).onDelete("cascade"),
		organizationInvitationInvitedByUserIdFk: foreignKey({
			columns: [table.invitedBy],
			foreignColumns: [user.id],
			name: "OrganizationInvitation_invitedBy_User_id_fk"
		}),
		organizationInvitationTokenUnique: unique("OrganizationInvitation_token_unique").on(table.token),
	}
});

export const organizationMember = pgTable("OrganizationMember", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid().notNull(),
	userId: uuid().notNull(),
	role: varchar().default('member').notNull(),
	joinedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	invitedBy: uuid(),
},
(table) => {
	return {
		organizationMemberOrganizationIdOrganizationIdFk: foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organization.id],
			name: "OrganizationMember_organizationId_Organization_id_fk"
		}).onDelete("cascade"),
		organizationMemberUserIdUserIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "OrganizationMember_userId_User_id_fk"
		}).onDelete("cascade"),
		organizationMemberInvitedByUserIdFk: foreignKey({
			columns: [table.invitedBy],
			foreignColumns: [user.id],
			name: "OrganizationMember_invitedBy_User_id_fk"
		}),
		organizationMemberOrganizationIdUserIdUnique: unique("OrganizationMember_organizationId_userId_unique").on(table.organizationId, table.userId),
	}
});

export const userOrganizationContext = pgTable("UserOrganizationContext", {
	userId: uuid().primaryKey().notNull(),
	activeOrganizationId: uuid(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
},
(table) => {
	return {
		userOrganizationContextUserIdUserIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "UserOrganizationContext_userId_User_id_fk"
		}).onDelete("cascade"),
		userOrganizationContextActiveOrganizationIdOrganizationIdFk: foreignKey({
			columns: [table.activeOrganizationId],
			foreignColumns: [organization.id],
			name: "UserOrganizationContext_activeOrganizationId_Organization_id_fk"
		}).onDelete("set null"),
	}
});

export const vote = pgTable("Vote", {
	chatId: uuid().notNull(),
	messageId: uuid().notNull(),
	isUpvoted: boolean().notNull(),
},
(table) => {
	return {
		voteChatIdChatIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
			name: "Vote_chatId_Chat_id_fk"
		}),
		voteMessageIdMessageIdFk: foreignKey({
			columns: [table.messageId],
			foreignColumns: [message.id],
			name: "Vote_messageId_Message_id_fk"
		}),
		voteChatIdMessageIdPk: primaryKey({ columns: [table.chatId, table.messageId], name: "Vote_chatId_messageId_pk"}),
	}
});

export const voteV2 = pgTable("Vote_v2", {
	chatId: uuid().notNull(),
	messageId: uuid().notNull(),
	isUpvoted: boolean().notNull(),
},
(table) => {
	return {
		voteV2ChatIdChatIdFk: foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
			name: "Vote_v2_chatId_Chat_id_fk"
		}),
		voteV2MessageIdMessageV2IdFk: foreignKey({
			columns: [table.messageId],
			foreignColumns: [messageV2.id],
			name: "Vote_v2_messageId_Message_v2_id_fk"
		}),
		voteV2ChatIdMessageIdPk: primaryKey({ columns: [table.chatId, table.messageId], name: "Vote_v2_chatId_messageId_pk"}),
	}
});

export const document = pgTable("Document", {
	id: uuid().defaultRandom().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
	title: text().notNull(),
	content: text(),
	userId: uuid().notNull(),
	text: varchar().default('text').notNull(),
},
(table) => {
	return {
		documentUserIdUserIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Document_userId_User_id_fk"
		}),
		documentIdCreatedAtPk: primaryKey({ columns: [table.id, table.createdAt], name: "Document_id_createdAt_pk"}),
	}
});