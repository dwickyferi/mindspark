import { myProvider } from '@/lib/ai/providers';
import { createDocumentHandler } from '@/lib/artifacts/server';
import { experimental_generateImage } from 'ai';

export const imageDocumentHandler = createDocumentHandler<'image'>({
  kind: 'image',
  onCreateDocument: async ({ title, contextText, dataStream }) => {
    let draftContent = '';

    const prompt = contextText
      ? `${title}

Context from previous conversation:
${contextText}

Use this context to inform your image generation and maintain consistency with the conversation.`
      : title;

    const { image } = await experimental_generateImage({
      model: myProvider.imageModel('small-model'),
      prompt,
      n: 1,
    });

    draftContent = image.base64;

    dataStream.write({
      type: 'data-imageDelta',
      data: image.base64,
      transient: true,
    });

    return draftContent;
  },
  onUpdateDocument: async ({ description, contextText, dataStream }) => {
    let draftContent = '';

    const prompt = contextText
      ? `${description}

Context from previous conversation:
${contextText}

Use this context to inform your image updates and maintain consistency with the conversation.`
      : description;

    const { image } = await experimental_generateImage({
      model: myProvider.imageModel('small-model'),
      prompt,
      n: 1,
    });

    draftContent = image.base64;

    dataStream.write({
      type: 'data-imageDelta',
      data: image.base64,
      transient: true,
    });

    return draftContent;
  },
});
