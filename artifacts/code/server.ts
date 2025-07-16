import { z } from 'zod';
import { streamObject } from 'ai';
import { myProvider } from '@/lib/ai/providers';
import { codePrompt, updateDocumentPrompt } from '@/lib/ai/prompts';
import { createDocumentHandler } from '@/lib/artifacts/server';

export const codeDocumentHandler = createDocumentHandler<'code'>({
  kind: 'code',
  onCreateDocument: async ({ title, contextText, dataStream }) => {
    let draftContent = '';

    const systemPrompt = contextText
      ? `${codePrompt}

Context from previous conversation:
${contextText}

Use this context to inform your code generation and maintain consistency with the conversation.`
      : codePrompt;

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: systemPrompt,
      prompt: title,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.write({
            type: 'data-codeDelta',
            data: code ?? '',
            transient: true,
          });

          draftContent = code;
        }
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, contextText, dataStream }) => {
    let draftContent = '';

    const systemPrompt = contextText
      ? `${updateDocumentPrompt(document.content, 'code')}

Context from previous conversation:
${contextText}

Use this context to inform your updates and maintain consistency with the conversation.`
      : updateDocumentPrompt(document.content, 'code');

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: systemPrompt,
      prompt: description,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { code } = object;

        if (code) {
          dataStream.write({
            type: 'data-codeDelta',
            data: code ?? '',
            transient: true,
          });

          draftContent = code;
        }
      }
    }

    return draftContent;
  },
});
