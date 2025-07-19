import { openai } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

// Create OpenRouter provider with error handling
let openRouter: any;
try {
  openRouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  });
  console.log('OpenRouter provider initialized successfully');
} catch (error) {
  console.error('Failed to initialize OpenRouter provider:', error);
  // Fallback to throw error when actually used
  openRouter = null;
}

export interface ChatModel {
  id: string;
  name: string;
  description: string;
  provider: 'openai' | 'openrouter';
  modelId: string;
  supportsTools?: boolean;
  isReasoning?: boolean;
}

// ✨ CENTRALIZED MODEL CONFIGURATION
// Add new models here and they'll be automatically available everywhere
export const chatModels: Array<ChatModel> = [
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    description: 'Primary model for all-purpose chat',
    provider: 'openai',
    modelId: 'gpt-4.1',
    supportsTools: true,
  },
  {
    id: 'moonshotai/kimi-k2',
    name: 'Kimi K2',
    description: 'Kimi K2 model by Moonshot AI',
    provider: 'openrouter',
    modelId: 'moonshotai/kimi-k2',
    supportsTools: true,
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek Chat',
    description: 'DeepSeek Chat model',
    provider: 'openrouter',
    modelId: 'deepseek/deepseek-chat',
    supportsTools: true,
  },
];

// Derived values - automatically generated from the models array
export const DEFAULT_CHAT_MODEL: string = 'gpt-4.1';

// Generate array of model IDs for schema validation
export const chatModelIds = chatModels.map(model => model.id);
export type ChatModelId = (typeof chatModels)[number]['id'];

// Helper functions
export const getModelById = (id: string): ChatModel | undefined => {
  return chatModels.find(model => model.id === id);
};

export const getModelProvider = (id: string) => {
  const model = getModelById(id);
  if (!model) throw new Error(`Model ${id} not found`);
  
  try {
    switch (model.provider) {
      case 'openai':
        return openai(model.modelId);
      case 'openrouter':
        // Add error handling and validation for OpenRouter
        if (!process.env.OPENROUTER_API_KEY) {
          throw new Error('OPENROUTER_API_KEY is not set in environment variables');
        }
        if (!openRouter) {
          throw new Error('OpenRouter provider failed to initialize');
        }
        console.log(`Creating OpenRouter model: ${model.modelId}`);
        return openRouter(model.modelId);
      default:
        throw new Error(`Provider ${model.provider} not supported`);
    }
  } catch (error) {
    console.error(`Error creating model provider for ${id}:`, error);
    throw error;
  }
};

export const modelSupportsTools = (id: string): boolean => {
  const model = getModelById(id);
  return model?.supportsTools ?? true;
};

export const isReasoningModel = (id: string): boolean => {
  const model = getModelById(id);
  return model?.isReasoning ?? false;
};
