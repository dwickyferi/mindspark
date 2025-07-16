import { tool } from 'ai';
import { z } from 'zod';

export interface TavilySearchResponse {
  query: string;
  follow_up_questions?: string[];
  answer?: string;
  images?: Array<{
    url: string;
    description?: string;
  }>;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
    published_date?: string;
    raw_content?: string;
    favicon?: string;
  }>;
}

export interface TavilyExtractResponse {
  results: Array<{
    url: string;
    content: string;
    raw_content?: string;
    favicon?: string;
    title?: string;
  }>;
}

const API_KEY = process.env.TAVILY_API_KEY;

const baseURLs = {
  search: 'https://api.tavily.com/search',
  extract: 'https://api.tavily.com/extract',
} as const;

const fetchTavily = async (url: string, body: any): Promise<TavilySearchResponse | TavilyExtractResponse> => {
  if (!API_KEY) {
    throw new Error('Tavily API key is not configured. Please add TAVILY_API_KEY to your environment variables.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      ...body,
      api_key: API_KEY,
    }),
  });

  if (response.status === 401) {
    throw new Error('Invalid Tavily API key');
  }
  if (response.status === 429) {
    throw new Error('Tavily API usage limit exceeded');
  }

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result;
};

export const webSearch = tool({
  description: 'Search the web for information on any topic. Returns search results with titles, summaries, URLs, and related images. Perfect for finding current information, news, and research.',
  inputSchema: z.object({
    query: z.string().describe('The search query to find information about'),
    max_results: z.number().min(1).max(20).default(10).describe('Maximum number of search results to return'),
    search_depth: z.enum(['basic', 'advanced']).default('basic').describe('Depth of search - basic for quick results, advanced for comprehensive search'),
    topic: z.enum(['general', 'news']).default('general').describe('Type of search - general for web search, news for recent news'),
    include_images: z.boolean().default(true).describe('Whether to include related images in results'),
    include_raw_content: z.boolean().default(false).describe('Whether to include raw HTML content'),
    time_range: z.enum(['day', 'week', 'month', 'year']).optional().describe('Time range for search results'),
    include_domains: z.array(z.string()).default([]).describe('Domains to specifically include in search'),
    exclude_domains: z.array(z.string()).default([]).describe('Domains to exclude from search'),
  }),
  execute: async (params) => {
    try {
      const result = await fetchTavily(baseURLs.search, {
        query: params.query,
        max_results: params.max_results,
        search_depth: params.search_depth,
        topic: params.topic,
        include_images: params.include_images,
        include_image_descriptions: params.include_images,
        include_raw_content: params.include_raw_content,
        time_range: params.time_range,
        include_domains: params.include_domains,
        exclude_domains: params.exclude_domains,
      }) as TavilySearchResponse;

      // Format the response for better readability
      const formattedResults = {
        query: result.query,
        results: result.results.map(item => ({
          title: item.title,
          url: item.url,
          content: item.content,
          score: item.score,
          published_date: item.published_date,
        })),
        images: result.images?.map(img => ({
          url: img.url,
          description: img.description,
        })) || [],
        follow_up_questions: result.follow_up_questions || [],
        answer: result.answer,
      };

      return {
        ...formattedResults,
        summary: `Found ${formattedResults.results.length} results for "${params.query}". You can ask follow-up questions or request more specific information about any of these results.`,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'An error occurred while searching',
        solution: 'Please check your Tavily API key configuration and try again. You can get a free API key at https://app.tavily.com/home',
      };
    }
  },
});

export const webExtract = tool({
  description: 'Extract detailed content from specific web pages. Perfect for getting full article content, detailed analysis, or comprehensive information from specific URLs.',
  inputSchema: z.object({
    urls: z.array(z.string()).describe('URLs to extract content from'),
    extract_depth: z.enum(['basic', 'advanced']).default('basic').describe('Depth of extraction - basic for quick content, advanced for comprehensive extraction'),
    include_images: z.boolean().default(false).describe('Whether to include images found in the content'),
  }),
  execute: async (params) => {
    try {
      const result = await fetchTavily(baseURLs.extract, {
        urls: params.urls,
        extract_depth: params.extract_depth,
        include_images: params.include_images,
      }) as TavilyExtractResponse;

      return {
        extracted_content: result.results.map(item => ({
          url: item.url,
          title: item.title,
          content: item.content,
          raw_content: item.raw_content,
        })),
        summary: `Successfully extracted content from ${result.results.length} URL(s). The content includes detailed information from the specified web pages.`,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'An error occurred while extracting content',
        solution: 'Please check the URLs and your Tavily API key configuration. Make sure the URLs are accessible and valid.',
      };
    }
  },
});
