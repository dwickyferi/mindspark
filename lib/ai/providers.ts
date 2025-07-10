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

// const openai = createOpenAI({
//   baseURL: 'https://ai.sumopod.com/v1',
//   apiKey: 'sk-aSO4YpEYT50um_5P0ntNPw',
// });

export const myProvider = customProvider({
      languageModels: {
        'gpt-4.1':openai('gpt-4.1'),
        'gpt-4.1-reasoning': wrapLanguageModel({
          model: xai('grok-3-mini-beta'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': openai('gpt-4.1'),
        'artifact-model': openai('gpt-4.1'),
      },
      imageModels: {
        'small-model': xai.imageModel('grok-2-image'),
      },
    });
