import { tool } from 'ai';
import { z } from 'zod';
import { generateObject } from 'ai';
import { getModelProvider } from '@/lib/ai/models';
import { compact } from 'lodash-es';

export interface ResearchProgress {
  currentDepth: number;
  totalDepth: number;
  currentBreadth: number;
  totalBreadth: number;
  currentQuery?: string;
  totalQueries: number;
  completedQueries: number;
}

export interface ResearchResult {
  learnings: string[];
  visitedUrls: string[];
  citations: Array<{
    url: string;
    title: string;
    content: string;
    relevance: number;
  }>;
}

const systemPrompt = () => {
  const now = new Date().toISOString();
  return `You are an expert researcher. Today is ${now}. Follow these instructions when responding:
  - You may be asked to research subjects that is after your knowledge cutoff, assume the user is right when presented with news.
  - The user is a highly experienced analyst, no need to simplify it, be as detailed as possible and make sure your response is correct.
  - Be highly organized and cite sources appropriately.
  - Suggest solutions that I didn't think about.
  - Be proactive and anticipate my needs.
  - Treat me as an expert in all subject matter.
  - Mistakes erode my trust, so be accurate and thorough.
  - Provide detailed explanations, I'm comfortable with lots of detail.
  - Value good arguments over authorities, the source is irrelevant.
  - Consider new technologies and contrarian ideas, not just the conventional wisdom.
  - You may use high levels of speculation or prediction, just flag it for me.`;
};

// Generate intelligent follow-up queries based on initial research
async function generateNextStepQueries({
  query,
  numQueries = 3,
  learnings = [],
}: {
  query: string;
  numQueries?: number;
  learnings?: string[];
}) {
  try {
    const res = await generateObject({
      model: getModelProvider('gpt-4.1'),
      system: systemPrompt(),
      prompt: `Given the following prompt from the user, generate a list of search queries to research the topic comprehensively. Return a maximum of ${numQueries} queries, but feel free to return less if the original prompt is clear. Make sure each query is unique and builds on previous research: <prompt>${query}</prompt>

${
      learnings.length > 0
        ? `Here are some learnings from previous research, use them to generate more specific queries: ${learnings.join('\n')}`
        : 'There are no learnings from previous research yet.'
    }

IMPORTANT: You must also provide a research strategy that includes:
1. Overall approach for investigating this topic
2. Expected outcomes and what we hope to discover

Generate both the search queries AND the research strategy.`,
    schema: z.object({
      queries: z
        .array(
          z.object({
            query: z.string().describe('The search query'),
            researchGoal: z
              .string()
              .describe('The specific research goal this query aims to accomplish'),
            priority: z.number().min(1).max(5).describe('Priority level (1-5, 5 being highest)'),
          }),
        )
        .describe(`List of search queries, max of ${numQueries}`),
      researchStrategy: z
        .object({
          approach: z.string().describe('Overall research approach'),
          expectedOutcomes: z.string().describe('What we expect to discover'),
        })
        .describe('Research strategy and expectations'),
    }),
  });

  return {
    queries: res.object.queries.slice(0, numQueries),
    strategy: res.object.researchStrategy || {
      approach: `Comprehensive research on: ${query}`,
      expectedOutcomes: 'Detailed insights and actionable findings',
    },
  };
  } catch (error) {
    console.error('❌ Error in generateNextStepQueries:', error);
    
    // Fallback response when AI generation fails
    return {
      queries: [{
        query: query,
        researchGoal: `Research the topic: ${query}`,
        priority: 5
      }],
      strategy: {
        approach: `Comprehensive research on: ${query}`,
        expectedOutcomes: 'Detailed insights and actionable findings',
      },
    };
  }
}

// Process search results and extract key learnings
async function processSerpResult({
  query,
  results,
  numLearnings = 3,
}: {
  query: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score?: number;
  }>;
  numLearnings?: number;
}) {
  const contents = compact(results.map((item) => item.content));
  
  if (contents.length === 0) {
    console.warn('⚠️ No valid content found in search results');
    return {
      learnings: [`Based on the query "${query}", further research is needed to provide comprehensive insights.`],
      followUpQuestions: [`What are the key aspects of ${query}?`, `What recent developments relate to ${query}?`],
      citations: [],
    };
  }

  try {
    const res = await generateObject({
      model: getModelProvider('gpt-4.1'),
      system: systemPrompt(),
      prompt: `Given the following search results for the query "${query}", extract key learnings and insights. Each learning should be detailed, specific, and include relevant facts, figures, or quotes when available.

Search Results:
${results.map((item, idx) => `
[${idx + 1}] ${item.title}
URL: ${item.url}
Content: ${item.content.slice(0, 2000)}...
`).join('\n')}

Focus on extracting actionable insights, concrete facts, and important contextual information.

IMPORTANT: 
- Always provide at least 1 learning, even if the results are limited
- Ensure relevance scores are between 1 and 10
- Provide at least 1 follow-up question
- Include at least 1 citation if any results are available`,
      schema: z.object({
        learnings: z
          .array(z.string().min(10))
          .min(1)
          .max(numLearnings)
          .describe(`Key learnings and insights, minimum 1, max of ${numLearnings}`),
        followUpQuestions: z
          .array(z.string().min(5))
          .min(1)
          .max(3)
          .describe('1-3 follow-up questions for deeper research'),
        citations: z
          .array(z.object({
            url: z.string().url(),
            title: z.string().min(1),
            relevantQuote: z.string().min(10),
            relevance: z.number().min(1).max(10).int(),
          }))
          .min(0)
          .max(results.length)
          .describe('Most relevant citations with quotes'),
      }),
    });

    return res.object;
  } catch (error) {
    console.error('❌ Error in processSerpResult:', error);
    
    // Fallback response when AI generation fails
    return {
      learnings: [
        `Research on "${query}" indicates this is an active area requiring further investigation.`,
        `The available information suggests multiple perspectives exist on ${query}.`,
        `Additional analysis would be beneficial to understand the full scope of ${query}.`
      ].slice(0, numLearnings),
      followUpQuestions: [
        `What are the latest developments in ${query}?`,
        `How does ${query} impact current trends?`
      ],
      citations: results.slice(0, 3).map(result => ({
        url: result.url || '',
        title: result.title || 'Untitled Source',
        relevantQuote: (result.content || '').slice(0, 150) + '...',
        relevance: 5
      }))
    };
  }
}

export { systemPrompt, generateNextStepQueries, processSerpResult };
