export const DEFAULT_CHAT_MODEL: string = 'gpt-4.1';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    description: 'Primary model for all-purpose chat',
  }
];
