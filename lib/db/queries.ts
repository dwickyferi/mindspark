import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  sql,
  type SQL,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat,
  stream,
  organization,
  organizationMember,
  organizationInvitation,
  organizationChat,
  userOrganizationContext,
  type Organization,
  type OrganizationMember,
  type OrganizationInvitation,
  type OrganizationChat,
  type UserOrganizationContext,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { generateUUID } from '../utils';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/visibility-selector';
import { ChatSDKError } from '../errors';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user by email',
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create user');
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create guest user',
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete chat by id',
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${startingAfter} not found`,
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError(
          'not_found:database',
          `Chat with id ${endingBefore} not found`,
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get chats by user id',
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get messages by chat id',
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to vote message');
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get votes by chat id',
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save document');
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get documents by id',
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get document by id',
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete documents by id after timestamp',
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to save suggestions',
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get suggestions by document id',
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message by id',
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by chat id after timestamp',
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: { id: string; differenceInHours: number }) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, 'user'),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create stream id',
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map((row) => row.id);
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get stream ids by chat id',
    );
  }
}

// =============================================================================
// Organization Management Functions
// =============================================================================

export async function createOrganization({
  name,
  description,
  ownerId,
}: {
  name: string;
  description?: string;
  ownerId: string;
}): Promise<Organization> {
  try {
    const [newOrganization] = await db
      .insert(organization)
      .values({
        name,
        description,
        ownerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Add the owner as a member with owner role
    await db.insert(organizationMember).values({
      organizationId: newOrganization.id,
      userId: ownerId,
      role: 'owner',
      joinedAt: new Date(),
    });

    // Set this as the user's active organization
    await db
      .insert(userOrganizationContext)
      .values({
        userId: ownerId,
        activeOrganizationId: newOrganization.id,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userOrganizationContext.userId,
        set: {
          activeOrganizationId: newOrganization.id,
          updatedAt: new Date(),
        },
      });

    return newOrganization;
  } catch (error) {
    console.error('Database error in createOrganization:', error);
    if (error instanceof Error && error.message.includes('unique constraint')) {
      throw new ChatSDKError(
        'bad_request:database',
        'Organization name already exists',
      );
    }
    if (error instanceof Error && (
      error.message.includes('relation') && error.message.includes('does not exist')
    )) {
      throw new ChatSDKError(
        'bad_request:database',
        'Organization tables do not exist. Please run database migrations first.',
      );
    }
    throw new ChatSDKError(
      'bad_request:database',
      `Failed to create organization: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

export async function getOrganizationsByUserId({
  userId,
}: {
  userId: string;
}): Promise<Array<Organization & { role: string; memberCount: number }>> {
  try {
    // Check if organization tables exist
    const tableExists = await db.execute(
      sql`SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Organization'
      );`
    );
    
    if (!tableExists[0]?.exists) {
      console.log('Organization tables do not exist yet, returning empty array');
      return [];
    }

    const organizations = await db
      .select({
        id: organization.id,
        name: organization.name,
        description: organization.description,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
        ownerId: organization.ownerId,
        role: organizationMember.role,
      })
      .from(organization)
      .innerJoin(
        organizationMember,
        eq(organization.id, organizationMember.organizationId),
      )
      .where(eq(organizationMember.userId, userId))
      .orderBy(desc(organization.createdAt));

    if (organizations.length === 0) {
      return [];
    }

    // Get member counts for each organization
    const orgIds = organizations.map((org) => org.id);
    const memberCounts = await db
      .select({
        organizationId: organizationMember.organizationId,
        count: count(organizationMember.id),
      })
      .from(organizationMember)
      .where(inArray(organizationMember.organizationId, orgIds))
      .groupBy(organizationMember.organizationId);

    const memberCountMap = new Map(
      memberCounts.map((mc) => [mc.organizationId, mc.count]),
    );

    return organizations.map((org) => ({
      ...org,
      memberCount: memberCountMap.get(org.id) || 0,
    }));
  } catch (error) {
    console.error('Database error in getOrganizationsByUserId:', error);
    // If the tables don't exist yet, return empty array instead of throwing
    if (error instanceof Error && (
      error.message.includes('relation') && error.message.includes('does not exist')
    )) {
      console.warn('Organization tables do not exist yet, returning empty array');
      return [];
    }
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get organizations by user id',
    );
  }
}

export async function getOrganizationById({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<Organization | null> {
  try {
    const [result] = await db
      .select()
      .from(organization)
      .innerJoin(
        organizationMember,
        eq(organization.id, organizationMember.organizationId),
      )
      .where(
        and(eq(organization.id, id), eq(organizationMember.userId, userId)),
      )
      .limit(1);

    return result ? result.Organization : null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get organization by id',
    );
  }
}

export async function getOrganizationMembers({
  organizationId,
  requesterId,
}: {
  organizationId: string;
  requesterId: string;
}): Promise<Array<OrganizationMember & { email: string }>> {
  try {
    // First check if the requester is a member of the organization
    const [requesterMembership] = await db
      .select()
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.organizationId, organizationId),
          eq(organizationMember.userId, requesterId),
        ),
      )
      .limit(1);

    if (!requesterMembership) {
      throw new ChatSDKError(
        'unauthorized:auth',
        'You are not a member of this organization',
      );
    }

    const members = await db
      .select({
        id: organizationMember.id,
        organizationId: organizationMember.organizationId,
        userId: organizationMember.userId,
        role: organizationMember.role,
        joinedAt: organizationMember.joinedAt,
        invitedBy: organizationMember.invitedBy,
        email: user.email,
      })
      .from(organizationMember)
      .innerJoin(user, eq(organizationMember.userId, user.id))
      .where(eq(organizationMember.organizationId, organizationId))
      .orderBy(desc(organizationMember.joinedAt));

    return members;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get organization members',
    );
  }
}

export async function createOrganizationInvitation({
  organizationId,
  email,
  role,
  invitedBy,
}: {
  organizationId: string;
  email: string;
  role: 'admin' | 'member';
  invitedBy: string;
}): Promise<OrganizationInvitation> {
  try {
    // Check if the inviter has permission (admin or owner)
    const [inviterMembership] = await db
      .select()
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.organizationId, organizationId),
          eq(organizationMember.userId, invitedBy),
        ),
      )
      .limit(1);

    if (!inviterMembership || inviterMembership.role === 'member') {
      throw new ChatSDKError(
        'forbidden:auth',
        'You do not have permission to invite members',
      );
    }

    // Check if user is already a member
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      const [existingMembership] = await db
        .select()
        .from(organizationMember)
        .where(
          and(
            eq(organizationMember.organizationId, organizationId),
            eq(organizationMember.userId, existingUser[0].id),
          ),
        )
        .limit(1);

      if (existingMembership) {
        throw new ChatSDKError(
          'bad_request:auth',
          'User is already a member of this organization',
        );
      }
    }

    // Create invitation token
    const token = generateUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [invitation] = await db
      .insert(organizationInvitation)
      .values({
        organizationId,
        email,
        role,
        token,
        invitedBy,
        createdAt: new Date(),
        expiresAt,
      })
      .returning();

    return invitation;
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to create organization invitation',
    );
  }
}

export async function acceptOrganizationInvitation({
  token,
  userId,
}: {
  token: string;
  userId: string;
}): Promise<void> {
  try {
    // Get the invitation
    const [invitation] = await db
      .select()
      .from(organizationInvitation)
      .where(eq(organizationInvitation.token, token))
      .limit(1);

    if (!invitation) {
      throw new ChatSDKError(
        'bad_request:auth',
        'Invalid invitation token',
      );
    }

    if (invitation.acceptedAt || invitation.rejectedAt) {
      throw new ChatSDKError(
        'bad_request:auth',
        'Invitation has already been processed',
      );
    }

    if (invitation.expiresAt < new Date()) {
      throw new ChatSDKError(
        'bad_request:auth',
        'Invitation has expired',
      );
    }

    // Get user email to verify
    const [userRecord] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRecord || userRecord.email !== invitation.email) {
      throw new ChatSDKError(
        'bad_request:auth',
        'Invitation email does not match your account',
      );
    }

    // Add user to organization
    await db.insert(organizationMember).values({
      organizationId: invitation.organizationId,
      userId,
      role: invitation.role,
      joinedAt: new Date(),
      invitedBy: invitation.invitedBy,
    });

    // Mark invitation as accepted
    await db
      .update(organizationInvitation)
      .set({ acceptedAt: new Date() })
      .where(eq(organizationInvitation.id, invitation.id));
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to accept organization invitation',
    );
  }
}

export async function updateOrganizationMemberRole({
  organizationId,
  userId,
  newRole,
  updatedBy,
}: {
  organizationId: string;
  userId: string;
  newRole: 'admin' | 'member';
  updatedBy: string;
}): Promise<void> {
  try {
    // Check if the updater has permission (admin or owner)
    const [updaterMembership] = await db
      .select()
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.organizationId, organizationId),
          eq(organizationMember.userId, updatedBy),
        ),
      )
      .limit(1);

    if (!updaterMembership || updaterMembership.role === 'member') {
      throw new ChatSDKError(
        'forbidden:auth',
        'You do not have permission to update member roles',
      );
    }

    // Check if target user is the owner (cannot change owner role)
    const [targetMembership] = await db
      .select()
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.organizationId, organizationId),
          eq(organizationMember.userId, userId),
        ),
      )
      .limit(1);

    if (!targetMembership) {
      throw new ChatSDKError(
        'bad_request:auth',
        'User is not a member of this organization',
      );
    }

    if (targetMembership.role === 'owner') {
      throw new ChatSDKError(
        'forbidden:auth',
        'Cannot change the role of the organization owner',
      );
    }

    // Update the role
    await db
      .update(organizationMember)
      .set({ role: newRole })
      .where(
        and(
          eq(organizationMember.organizationId, organizationId),
          eq(organizationMember.userId, userId),
        ),
      );
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update organization member role',
    );
  }
}

export async function removeOrganizationMember({
  organizationId,
  userId,
  removedBy,
}: {
  organizationId: string;
  userId: string;
  removedBy: string;
}): Promise<void> {
  try {
    // Check if the remover has permission (admin or owner)
    const [removerMembership] = await db
      .select()
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.organizationId, organizationId),
          eq(organizationMember.userId, removedBy),
        ),
      )
      .limit(1);

    if (!removerMembership || removerMembership.role === 'member') {
      throw new ChatSDKError(
        'forbidden:auth',
        'You do not have permission to remove members',
      );
    }

    // Check if target user is the owner (cannot remove owner)
    const [targetMembership] = await db
      .select()
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.organizationId, organizationId),
          eq(organizationMember.userId, userId),
        ),
      )
      .limit(1);

    if (!targetMembership) {
      throw new ChatSDKError(
        'bad_request:auth',
        'User is not a member of this organization',
      );
    }

    if (targetMembership.role === 'owner') {
      throw new ChatSDKError(
        'forbidden:auth',
        'Cannot remove the organization owner',
      );
    }

    // Remove the member
    await db
      .delete(organizationMember)
      .where(
        and(
          eq(organizationMember.organizationId, organizationId),
          eq(organizationMember.userId, userId),
        ),
      );
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to remove organization member',
    );
  }
}

export async function deleteOrganization({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}): Promise<void> {
  try {
    // Check if the user is the owner
    const [orgRecord] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!orgRecord || orgRecord.ownerId !== userId) {
      throw new ChatSDKError(
        'forbidden:auth',
        'Only the organization owner can delete the organization',
      );
    }

    // Delete the organization (cascade will handle related records)
    await db
      .delete(organization)
      .where(eq(organization.id, organizationId));
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete organization',
    );
  }
}

export async function setActiveOrganization({
  userId,
  organizationId,
}: {
  userId: string;
  organizationId: string | null;
}): Promise<void> {
  try {
    if (organizationId) {
      // Verify user is a member of the organization
      const [membership] = await db
        .select()
        .from(organizationMember)
        .where(
          and(
            eq(organizationMember.organizationId, organizationId),
            eq(organizationMember.userId, userId),
          ),
        )
        .limit(1);

      if (!membership) {
        throw new ChatSDKError(
          'forbidden:auth',
          'You are not a member of this organization',
        );
      }
    }

    // Update or create user organization context
    await db
      .insert(userOrganizationContext)
      .values({
        userId,
        activeOrganizationId: organizationId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userOrganizationContext.userId,
        set: {
          activeOrganizationId: organizationId,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to set active organization',
    );
  }
}

export async function getUserActiveOrganization({
  userId,
}: {
  userId: string;
}): Promise<Organization | null> {
  try {
    const [result] = await db
      .select()
      .from(userOrganizationContext)
      .innerJoin(
        organization,
        eq(userOrganizationContext.activeOrganizationId, organization.id),
      )
      .where(eq(userOrganizationContext.userId, userId))
      .limit(1);

    return result ? result.Organization : null;
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get user active organization',
    );
  }
}

export async function getPendingInvitations(
  email: string,
): Promise<Array<OrganizationInvitation & { organization: Organization }>> {
  try {
    const invitations = await db
      .select()
      .from(organizationInvitation)
      .innerJoin(
        organization,
        eq(organizationInvitation.organizationId, organization.id),
      )
      .where(
        and(
          eq(organizationInvitation.email, email),
          gt(organizationInvitation.expiresAt, new Date()),
          isNull(organizationInvitation.acceptedAt),
          isNull(organizationInvitation.rejectedAt),
        ),
      )
      .orderBy(desc(organizationInvitation.createdAt));

    return invitations.map((row) => ({
      ...row.OrganizationInvitation,
      organization: row.Organization,
    }));
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get pending invitations',
    );
  }
}

export async function deleteInvitation(
  invitationId: string,
  userEmail: string,
): Promise<void> {
  try {
    const result = await db
      .update(organizationInvitation)
      .set({ rejectedAt: new Date() })
      .where(
        and(
          eq(organizationInvitation.id, invitationId),
          eq(organizationInvitation.email, userEmail),
          isNull(organizationInvitation.acceptedAt),
          isNull(organizationInvitation.rejectedAt),
        ),
      )
      .returning();

    if (result.length === 0) {
      throw new ChatSDKError(
        'forbidden:auth',
        'Invitation not found, unauthorized, or already processed',
      );
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      throw error;
    }
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete invitation',
    );
  }
}

export async function updateOrganization({
  id,
  name,
  description,
  userId,
}: {
  id: string;
  name: string;
  description?: string;
  userId: string;
}): Promise<Organization> {
  try {
    // Check if user is the owner or admin of the organization
    const [membership] = await db
      .select()
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.organizationId, id),
          eq(organizationMember.userId, userId),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new ChatSDKError(
        'forbidden:auth',
        'You are not a member of this organization',
      );
    }

    if (membership.role !== 'owner' && membership.role !== 'admin') {
      throw new ChatSDKError(
        'forbidden:auth',
        'You do not have permission to update this organization',
      );
    }

    // Update the organization
    const [updatedOrganization] = await db
      .update(organization)
      .set({
        name,
        description,
        updatedAt: new Date(),
      })
      .where(eq(organization.id, id))
      .returning();

    if (!updatedOrganization) {
      throw new ChatSDKError(
        'bad_request:database',
        'Organization not found',
      );
    }

    return updatedOrganization;
  } catch (error) {
    console.error('Database error in updateOrganization:', error);
    if (error instanceof ChatSDKError) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('unique constraint')) {
      throw new ChatSDKError(
        'bad_request:database',
        'Organization name already exists',
      );
    }
    throw new ChatSDKError(
      'bad_request:database',
      `Failed to update organization: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
