import { z } from 'zod';
import type { getWeather } from './ai/tools/get-weather';
import type { createDocument } from './ai/tools/create-document';
import type { updateDocument } from './ai/tools/update-document';
import type { requestSuggestions } from './ai/tools/request-suggestions';
import type { webSearch, webExtract } from './ai/tools/web-search';
import type { createChart } from './ai/tools/create-chart';
import type { deepResearch } from './ai/tools/deep-research/tool';
import type { InferUITool, UIMessage } from 'ai';

import type { ArtifactKind } from '@/components/artifact';
import type { Suggestion } from './db/schema';

export type DataPart = { type: 'append-message'; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;
type webSearchTool = InferUITool<typeof webSearch>;
type webExtractTool = InferUITool<typeof webExtract>;
type createChartTool = InferUITool<ReturnType<typeof createChart>>;
type deepResearchTool = InferUITool<typeof deepResearch>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  webSearch: webSearchTool;
  webExtract: webExtractTool;
  createChart: createChartTool;
  deepResearch: deepResearchTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  contextText: string;
  clear: null;
  finish: null;
  researchStep: {
    id: string;
    type: 'strategy' | 'search' | 'analyze' | 'synthesize' | 'report';
    title: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    details?: string;
    progress?: number;
    timestamp?: string;
    metadata?: {
      queryCount?: number;
      sourceCount?: number;
      depth?: number;
      breadth?: number;
      learningCount?: number;
      duration?: number;
    };
  };
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}
