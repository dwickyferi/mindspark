import { openai } from "@ai-sdk/openai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { LanguageModel } from "ai";
import {
  createOpenAICompatibleModels,
  openaiCompatibleModelsSafeParse,
} from "./create-openai-compatiable";
import { ChatModel } from "app-types/chat";

const staticModels = {
  openai: {
    "gpt-4.1": openai("gpt-4.1"),
    "gpt-4.1-mini": openai("gpt-4.1-mini"),
    "4o": openai("gpt-4o"),
    "4o-mini": openai("gpt-4o-mini", {}),
    "o4-mini": openai("o4-mini", {
      reasoningEffort: "medium",
    }),
  },
  openRouter: {
    "qwen3-8b:free": openrouter("qwen/qwen3-8b:free"),
    "qwen3-14b:free": openrouter("qwen/qwen3-14b:free"),
    "qwen/qwen3-235b-a22b-07-25:free": openrouter(
      "qwen/qwen3-235b-a22b-07-25:free",
    ),
    "x-ai/grok-4": openrouter("x-ai/grok-4"),
    "x-ai/grok-3-mini": openrouter("x-ai/grok-3-mini"),
    "anthropic/claude-sonnet-4": openrouter("anthropic/claude-sonnet-4"),
    "anthropic/claude-3.7-sonnet": openrouter("anthropic/claude-3.7-sonnet"),
    "anthropic/claude-3-5-sonnet": openrouter("anthropic/claude-3-5-sonnet"),
    "google/gemini-2.5-flash-lite": openrouter("google/gemini-2.5-flash-lite"),
    "openai/gpt-4o": openrouter("openai/gpt-4o"),
    "openai/gpt-4.1": openrouter("openai/gpt-4.1"),
  },
};

const staticUnsupportedModels = new Set([
  staticModels.openai["o4-mini"],
  staticModels.openRouter["qwen3-8b:free"],
  staticModels.openRouter["qwen3-14b:free"],
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
