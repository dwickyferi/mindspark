import { relations } from "drizzle-orm/relations";
import { user, suggestion, document, chat, message, messageV2, stream, organization, organizationChat, organizationInvitation, organizationMember, userOrganizationContext, vote, voteV2 } from "./schema";

export const suggestionRelations = relations(suggestion, ({one}) => ({
	user: one(user, {
		fields: [suggestion.userId],
		references: [user.id]
	}),
	document: one(document, {
		fields: [suggestion.documentId],
		references: [document.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	suggestions: many(suggestion),
	chats: many(chat),
	organizations: many(organization),
	organizationChats: many(organizationChat),
	organizationInvitations: many(organizationInvitation),
	organizationMembers_userId: many(organizationMember, {
		relationName: "organizationMember_userId_user_id"
	}),
	organizationMembers_invitedBy: many(organizationMember, {
		relationName: "organizationMember_invitedBy_user_id"
	}),
	userOrganizationContexts: many(userOrganizationContext),
	documents: many(document),
}));

export const documentRelations = relations(document, ({one, many}) => ({
	suggestions: many(suggestion),
	user: one(user, {
		fields: [document.userId],
		references: [user.id]
	}),
}));

export const messageRelations = relations(message, ({one, many}) => ({
	chat: one(chat, {
		fields: [message.chatId],
		references: [chat.id]
	}),
	votes: many(vote),
}));

export const chatRelations = relations(chat, ({one, many}) => ({
	messages: many(message),
	user: one(user, {
		fields: [chat.userId],
		references: [user.id]
	}),
	messageV2s: many(messageV2),
	streams: many(stream),
	votes: many(vote),
	voteV2s: many(voteV2),
}));

export const messageV2Relations = relations(messageV2, ({one, many}) => ({
	chat: one(chat, {
		fields: [messageV2.chatId],
		references: [chat.id]
	}),
	voteV2s: many(voteV2),
}));

export const streamRelations = relations(stream, ({one}) => ({
	chat: one(chat, {
		fields: [stream.chatId],
		references: [chat.id]
	}),
}));

export const organizationRelations = relations(organization, ({one, many}) => ({
	user: one(user, {
		fields: [organization.ownerId],
		references: [user.id]
	}),
	organizationChats: many(organizationChat),
	organizationInvitations: many(organizationInvitation),
	organizationMembers: many(organizationMember),
	userOrganizationContexts: many(userOrganizationContext),
}));

export const organizationChatRelations = relations(organizationChat, ({one}) => ({
	user: one(user, {
		fields: [organizationChat.userId],
		references: [user.id]
	}),
	organization: one(organization, {
		fields: [organizationChat.organizationId],
		references: [organization.id]
	}),
}));

export const organizationInvitationRelations = relations(organizationInvitation, ({one}) => ({
	organization: one(organization, {
		fields: [organizationInvitation.organizationId],
		references: [organization.id]
	}),
	user: one(user, {
		fields: [organizationInvitation.invitedBy],
		references: [user.id]
	}),
}));

export const organizationMemberRelations = relations(organizationMember, ({one}) => ({
	organization: one(organization, {
		fields: [organizationMember.organizationId],
		references: [organization.id]
	}),
	user_userId: one(user, {
		fields: [organizationMember.userId],
		references: [user.id],
		relationName: "organizationMember_userId_user_id"
	}),
	user_invitedBy: one(user, {
		fields: [organizationMember.invitedBy],
		references: [user.id],
		relationName: "organizationMember_invitedBy_user_id"
	}),
}));

export const userOrganizationContextRelations = relations(userOrganizationContext, ({one}) => ({
	user: one(user, {
		fields: [userOrganizationContext.userId],
		references: [user.id]
	}),
	organization: one(organization, {
		fields: [userOrganizationContext.activeOrganizationId],
		references: [organization.id]
	}),
}));

export const voteRelations = relations(vote, ({one}) => ({
	chat: one(chat, {
		fields: [vote.chatId],
		references: [chat.id]
	}),
	message: one(message, {
		fields: [vote.messageId],
		references: [message.id]
	}),
}));

export const voteV2Relations = relations(voteV2, ({one}) => ({
	chat: one(chat, {
		fields: [voteV2.chatId],
		references: [chat.id]
	}),
	messageV2: one(messageV2, {
		fields: [voteV2.messageId],
		references: [messageV2.id]
	}),
}));