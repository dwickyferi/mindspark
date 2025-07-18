import type {
  CoreAssistantMessage,
  CoreToolMessage,
  UIMessage,
  UIMessagePart,
} from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { DBMessage, Document } from '@/lib/db/schema';
import { ChatSDKError, type ErrorCode } from './errors';
import type { ChatMessage, ChatTools, CustomUIDataTypes } from './types';
import { formatISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    const { code, cause } = await response.json();
    throw new ChatSDKError(code as ErrorCode, cause);
  }

  return response.json();
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      const { code, cause } = await response.json();
      throw new ChatSDKError(code as ErrorCode, cause);
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ChatSDKError('offline:chat');
    }

    throw error;
  }
}

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index].createdAt;
}

export function getTrailingMessageId({
  messages,
}: {
  messages: Array<ResponseMessage>;
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}

export function sanitizeText(text: string) {
  return text.replace('<has_function_call>', '');
}

export function convertToUIMessages(messages: DBMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role as 'user' | 'assistant' | 'system',
    parts: message.parts as UIMessagePart<CustomUIDataTypes, ChatTools>[],
    metadata: {
      createdAt: formatISO(message.createdAt),
    },
  }));
}

export function getTextFromMessage(message: ChatMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
    .replace(/<!--SELECTED_TOOLS:.*?-->/g, '')
    .replace(/\[User has requested deep research analysis on this topic\]/g, '')
    .replace(/\[User has requested deep research analysis\]/g, '')
    .replace(/\n\n$/, '') // Remove trailing newlines
    .trim();
}

/**
 * Generates contextText from historical chat messages for use in artifacts
 * @param messages - Array of chat messages
 * @param maxLength - Maximum length of contextText (default: 3000)
 * @returns Concatenated text from historical messages
 */
export function generateContextText(
  messages: ChatMessage[],
  maxLength: number = 3000,
): string {
  if (!messages || messages.length === 0) {
    return '';
  }

  // Filter out the last message (current) and tool calls
  const historicalMessages = messages.slice(0, -1);
  
  let contextText = '';
  
  // Process messages from most recent to oldest
  for (let i = historicalMessages.length - 1; i >= 0; i--) {
    const message = historicalMessages[i];
    
    // Skip if no parts
    if (!message.parts || message.parts.length === 0) continue;
    
    // Extract text content from message parts
    let messageText = '';
    
    for (const part of message.parts) {
      if (part.type === 'text') {
        messageText += part.text + ' ';
      }
    }
    
    // Skip empty messages
    if (!messageText.trim()) continue;
    
    // Add role prefix for clarity
    const rolePrefix = message.role === 'user' ? 'User: ' : 'Assistant: ';
    const formattedMessage = `${rolePrefix}${messageText.trim()}\n\n`;
    
    // Check if adding this message would exceed max length
    if (contextText.length + formattedMessage.length > maxLength) {
      break;
    }
    
    contextText = formattedMessage + contextText;
  }
  
  return contextText.trim();
}
