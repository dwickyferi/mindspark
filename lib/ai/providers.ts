import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { xai } from '@ai-sdk/xai';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { isTestEnvironment } from '../constants';
import { openai } from '@ai-sdk/openai';
import { chatModels, getModelProvider } from './models';

// Dynamically create language models from centralized config
const createLanguageModels = () => {
  const models: Record<string, any> = {};
  
  // Add chat models from centralized config
  chatModels.forEach(model => {
    models[model.id] = getModelProvider(model.id);
  });
  
  // Add special purpose models
  models['title-model'] = openai('gpt-4.1');
  models['artifact-model'] = openai('gpt-4.1');

  return models;
};

export const myProvider = customProvider({
  languageModels: createLanguageModels(),
  imageModels: {
    'small-model': xai.imageModel('grok-2-image'),
  },
});
