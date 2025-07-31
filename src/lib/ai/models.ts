import { openrouter } from "@openrouter/ai-sdk-provider";
import { LanguageModel } from "ai";
import {
  createOpenAICompatibleModels,
  openaiCompatibleModelsSafeParse,
} from "./create-openai-compatiable";
import { ChatModel } from "app-types/chat";

const staticModels = {
  openai: {
    "gpt-4.1": openrouter("openai/gpt-4o"),
    "gpt-4.1-mini": openrouter("openai/gpt-4.1-mini"),
    "gpt-4o": openrouter("openai/gpt-4o"),
  },
  qwen: {
    "qwen3-8b": openrouter("qwen/qwen3-8b:free"),
    "qwen3-14b": openrouter("qwen/qwen3-14b:free"),
    "qwen3-235b-a22b-07-25": openrouter("qwen/qwen3-235b-a22b-07-25:free"),
    "qwen3-coder": openrouter("qwen/qwen3-coder:free"),
  },
  xai: {
    "grok-3-mini": openrouter("x-ai/grok-3-mini"),
    "grok-4": openrouter("x-ai/grok-4"),
  },
  anthropic: {
    "claude-3-5-sonnet": openrouter("anthropic/claude-3-5-sonnet"),
    "claude-3.5-haiku": openrouter("anthropic/claude-3.5-haiku"),
    "claude-3.7-sonnet": openrouter("anthropic/claude-3.7-sonnet"),
    "claude-sonnet-4": openrouter("anthropic/claude-sonnet-4"),
  },
  moonshot: {
    "kimi-k2": openrouter("moonshotai/kimi-k2:free"),
  },
  deepseek: {
    "deepseek-chat-v3-0324": openrouter("deepseek/deepseek-chat-v3-0324:free"),
    "deepseek-r1-0528": openrouter("deepseek/deepseek-r1-0528:free"),
  },
  google: {
    "gemini-2.5-flash-lite": openrouter("google/gemini-2.5-flash-lite"),
    "gemini-2.5-flash": openrouter("google/gemini-2.5-flash"),
    "gemini-2.5-pro": openrouter("google/gemini-2.5-pro"),
  },
  mistral: {
    "mistral-nemo": openrouter("mistralai/mistral-nemo"),
  },
};

const staticUnsupportedModels = new Set([
  staticModels.openai["o4-mini"],
  staticModels.qwen["qwen3-8b:free"],
  staticModels.qwen["qwen3-14b:free"],
]);

const openaiCompatibleProviders = openaiCompatibleModelsSafeParse(
  process.env.OPENAI_COMPATIBLE_DATA,
);

const {
  providers: openaiCompatibleModels,
  unsupportedModels: openaiCompatibleUnsupportedModels,
} = createOpenAICompatibleModels(openaiCompatibleProviders);

const allModels = { ...openaiCompatibleModels, ...staticModels };

const allUnsupportedModels = new Set([
  ...openaiCompatibleUnsupportedModels,
  ...staticUnsupportedModels,
]);

export const isToolCallUnsupportedModel = (model: LanguageModel) => {
  return allUnsupportedModels.has(model);
};

const firstProvider = Object.keys(allModels)[0];
const firstModel = Object.keys(allModels[firstProvider])[0];

const fallbackModel = allModels[firstProvider][firstModel];

export const customModelProvider = {
  modelsInfo: Object.entries(allModels).map(([provider, models]) => ({
    provider,
    models: Object.entries(models).map(([name, model]) => ({
      name,
      isToolCallUnsupported: isToolCallUnsupportedModel(model),
    })),
  })),
  getModel: (model?: ChatModel): LanguageModel => {
    if (!model) return fallbackModel;
    return allModels[model.provider]?.[model.model] || fallbackModel;
  },
};
