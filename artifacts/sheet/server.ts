import { myProvider } from '@/lib/ai/providers';
import { sheetPrompt, updateDocumentPrompt } from '@/lib/ai/prompts';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { streamObject } from 'ai';
import { z } from 'zod';

export const sheetDocumentHandler = createDocumentHandler<'sheet'>({
  kind: 'sheet',
  onCreateDocument: async ({ title, contextText, dataStream }) => {
    let draftContent = '';

    const systemPrompt = contextText
      ? `${sheetPrompt}

Context from previous conversation:
${contextText}

Use this context to inform your spreadsheet creation and maintain consistency with the conversation.`
      : sheetPrompt;

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: systemPrompt,
      prompt: title,
      schema: z.object({
        csv: z.string().describe('CSV data'),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.write({
            type: 'data-sheetDelta',
            data: csv,
            transient: true,
          });

          draftContent = csv;
        }
      }
    }

    dataStream.write({
      type: 'data-sheetDelta',
      data: draftContent,
      transient: true,
    });

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, contextText, dataStream }) => {
    let draftContent = '';

    const systemPrompt = contextText
      ? `${updateDocumentPrompt(document.content, 'sheet')}

Context from previous conversation:
${contextText}

Use this context to inform your updates and maintain consistency with the conversation.`
      : updateDocumentPrompt(document.content, 'sheet');

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: systemPrompt,
      prompt: description,
      schema: z.object({
        csv: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { csv } = object;

        if (csv) {
          dataStream.write({
            type: 'data-sheetDelta',
            data: csv,
            transient: true,
          });

          draftContent = csv;
        }
      }
    }

    return draftContent;
  },
});
