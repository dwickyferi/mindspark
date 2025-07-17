import { tool } from 'ai';
import { z } from 'zod';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { 
  ResearchProgress, 
  ResearchResult, 
  generateNextStepQueries, 
  processSerpResult,
  systemPrompt 
} from './index';
import { nanoid } from 'nanoid';

const ConcurrencyLimit = 2; // Tavily API rate limiting

export const deepResearch = tool({
  description: `Conduct comprehensive deep research on any topic with intelligent multi-step analysis. 
  
  This tool performs progressive research by:
  1. Breaking down complex topics into strategic search queries
  2. Conducting parallel web searches with different approaches
  3. Analyzing and synthesizing findings from multiple sources
  4. Generating follow-up research based on discoveries
  5. Creating comprehensive reports with citations
  
  Perfect for: market research, academic analysis, trend investigation, competitive analysis, 
  technical deep-dives, policy research, and comprehensive topic exploration.`,
  
  inputSchema: z.object({
    query: z.string().describe('The main research question or topic to investigate'),
    depth: z.number().min(1).max(4).default(2).describe('Research depth (1-4, where 4 is most comprehensive)'),
    breadth: z.number().min(2).max(6).default(3).describe('Number of parallel research paths to explore'),
    focus_areas: z.array(z.string()).optional().describe('Specific areas to focus the research on'),
    time_scope: z.enum(['recent', 'historical', 'comprehensive']).default('comprehensive').describe('Time scope for research'),
    output_format: z.enum(['summary', 'detailed_report', 'executive_brief']).default('detailed_report').describe('Desired output format'),
  }),

  execute: async ({ 
    query, 
    depth = 2, 
    breadth = 3, 
    focus_areas = [], 
    time_scope = 'comprehensive',
    output_format = 'detailed_report'
  }) => {
    const researchId = nanoid();
    const startTime = Date.now();
    
    console.log(`🔍 Starting deep research: "${query}" (depth: ${depth}, breadth: ${breadth})`);
    
    try {
      // Phase 1: Generate initial research strategy
      const { queries: initialQueries, strategy } = await generateNextStepQueries({
        query: focus_areas.length > 0 
          ? `${query}. Focus specifically on: ${focus_areas.join(', ')}`
          : query,
        numQueries: breadth,
        learnings: [],
      });

      console.log(`📋 Research strategy: ${strategy.approach}`);
      console.log(`🎯 Initial queries generated: ${initialQueries.length}`);

      let allLearnings: string[] = [];
      let allUrls: string[] = [];
      let allCitations: Array<{ url: string; title: string; content: string; relevance: number }> = [];
      let completedSteps = 0;
      const totalSteps = breadth * depth;

      // Phase 2: Execute progressive research iterations
      for (let currentDepth = 1; currentDepth <= depth; currentDepth++) {
        const currentQueries = currentDepth === 1 
          ? initialQueries 
          : (await generateNextStepQueries({
              query,
              numQueries: Math.max(2, Math.floor(breadth / currentDepth)),
              learnings: allLearnings.slice(-5), // Use recent learnings for context
            })).queries;

        console.log(`📊 Depth ${currentDepth}/${depth}: Processing ${currentQueries.length} queries`);

        // Execute searches in parallel with limited concurrency
        const searchPromises = currentQueries.map(async (searchQuery, idx) => {
          try {
            // Import Tavily directly
            const API_KEY = process.env.TAVILY_API_KEY;
            if (!API_KEY) {
              throw new Error('Tavily API key is not configured');
            }
            
            // Construct search parameters based on time scope and research context
            const searchBody = {
              api_key: API_KEY,
              query: searchQuery.query,
              max_results: Math.min(8, 15 - searchQuery.priority),
              search_depth: currentDepth > 2 ? 'advanced' : 'basic',
              topic: time_scope === 'recent' ? 'news' : 'general',
              include_answer: true,
              include_images: false,
              include_raw_content: false,
            };

            // Call Tavily API directly
            const response = await fetch('https://api.tavily.com/search', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${API_KEY}`,
              },
              body: JSON.stringify(searchBody),
            });

            if (!response.ok) {
              throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
            }

            const searchResult = await response.json();
            
            if (!searchResult.results || searchResult.results.length === 0) {
              console.warn(`⚠️ No results for "${searchQuery.query}"`);
              return null;
            }

            // Process results to extract learnings
            const processed = await processSerpResult({
              query: searchQuery.query,
              results: searchResult.results.map((r: any) => ({
                title: r.title,
                url: r.url,
                content: r.content,
                score: r.score,
              })),
              numLearnings: Math.min(4, 8 - currentDepth),
            });

            return {
              query: searchQuery,
              searchResult: {
                results: searchResult.results,
                answer: searchResult.answer,
              },
              processed,
            };
          } catch (error) {
            console.error(`❌ Error processing query "${searchQuery.query}":`, error);
            return null;
          }
        });

        // Wait for all searches in this depth level to complete
        const searchResults = (await Promise.all(searchPromises)).filter(Boolean);
        
        // Aggregate findings from this depth level
        for (const result of searchResults) {
          if (result) {
            allLearnings.push(...result.processed.learnings);
            allUrls.push(...result.searchResult.results.map((r: any) => r.url));
            allCitations.push(...result.processed.citations.map(c => ({
              url: c.url,
              title: c.title,
              content: c.relevantQuote,
              relevance: c.relevance,
            })));
            completedSteps++;
          }
        }

        console.log(`✅ Completed depth ${currentDepth}: ${allLearnings.length} total learnings`);
      }

      // Phase 3: Generate comprehensive research report
      const finalReport = await generateFinalReport({
        originalQuery: query,
        learnings: allLearnings,
        citations: allCitations,
        urls: [...new Set(allUrls)],
        strategy,
        outputFormat: output_format,
        researchMetadata: {
          depth,
          breadth,
          focusAreas: focus_areas,
          timeScope: time_scope,
          duration: Date.now() - startTime,
          sourcesCount: allCitations.length,
        },
      });

      return {
        research_id: researchId,
        status: 'completed',
        original_query: query,
        research_strategy: strategy,
        total_sources: allUrls.length,
        unique_sources: [...new Set(allUrls)].length,
        key_learnings: allLearnings.slice(0, 10), // Top 10 learnings
        comprehensive_report: finalReport,
        citations: allCitations
          .sort((a, b) => b.relevance - a.relevance)
          .slice(0, 20), // Top 20 most relevant citations
        research_metadata: {
          depth_completed: depth,
          breadth_completed: breadth,
          total_searches: completedSteps,
          duration_ms: Date.now() - startTime,
          focus_areas,
          time_scope,
        },
        recommendations: await generateResearchRecommendations(query, allLearnings),
      };

    } catch (error) {
      console.error('❌ Deep research failed:', error);
      return {
        research_id: researchId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        partial_results: {
          learnings: [],
          citations: [],
          duration_ms: Date.now() - startTime,
        },
      };
    }
  },
});

// Generate comprehensive final report
async function generateFinalReport({
  originalQuery,
  learnings,
  citations,
  urls,
  strategy,
  outputFormat,
  researchMetadata,
}: {
  originalQuery: string;
  learnings: string[];
  citations: Array<{ url: string; title: string; content: string; relevance: number }>;
  urls: string[];
  strategy: { approach: string; expectedOutcomes: string };
  outputFormat: 'summary' | 'detailed_report' | 'executive_brief';
  researchMetadata: any;
}) {
  const learningsText = learnings
    .slice(0, 20) // Use top 20 learnings
    .map((learning, idx) => `${idx + 1}. ${learning}`)
    .join('\n');

  const citationsText = citations
    .slice(0, 15) // Use top 15 citations
    .map((citation, idx) => `[${idx + 1}] ${citation.title}\n   ${citation.url}\n   "${citation.content}"\n`)
    .join('\n');

  const reportLength = outputFormat === 'summary' ? '2-3 paragraphs' : 
                      outputFormat === 'executive_brief' ? '1-2 pages' : 
                      '3-5 pages';

  const res = await generateObject({
    model: openai('gpt-4o'),
    system: systemPrompt(),
    prompt: `Generate a comprehensive research report based on the following deep research findings:

ORIGINAL QUERY: ${originalQuery}

RESEARCH STRATEGY: ${strategy.approach}
EXPECTED OUTCOMES: ${strategy.expectedOutcomes}

KEY LEARNINGS:
${learningsText}

SOURCES AND CITATIONS:
${citationsText}

RESEARCH METADATA:
- Sources analyzed: ${researchMetadata.sourcesCount}
- Research depth: ${researchMetadata.depth} levels
- Focus areas: ${researchMetadata.focusAreas.join(', ') || 'General'}
- Time scope: ${researchMetadata.timeScope}

Create a ${reportLength} ${outputFormat} that:
1. Directly answers the original research question
2. Synthesizes the key findings into actionable insights
3. Highlights any surprising or contradictory findings
4. Provides specific recommendations based on the research
5. Includes proper citations and source attribution
6. Identifies knowledge gaps or areas needing further investigation`,

    schema: z.object({
      title: z.string().describe('Compelling title for the research report'),
      executive_summary: z.string().describe('Brief executive summary (2-3 sentences)'),
      main_findings: z.array(z.string()).describe('3-5 key findings with supporting evidence'),
      detailed_analysis: z.string().describe('Comprehensive analysis addressing the research question'),
      recommendations: z.array(z.string()).describe('Actionable recommendations based on findings'),
      knowledge_gaps: z.array(z.string()).describe('Areas requiring further research'),
      confidence_assessment: z.object({
        overall_confidence: z.number().min(1).max(10).describe('Overall confidence in findings (1-10)'),
        reasoning: z.string().describe('Explanation of confidence level'),
      }),
    }),
  });

  return res.object;
}

// Generate actionable recommendations
async function generateResearchRecommendations(query: string, learnings: string[]) {
  const res = await generateObject({
    model: openai('gpt-4o'),
    system: systemPrompt(),
    prompt: `Based on the research findings for "${query}", generate specific, actionable recommendations:

KEY LEARNINGS:
${learnings.slice(0, 10).join('\n')}

Provide recommendations that are:
1. Specific and actionable
2. Prioritized by impact and feasibility
3. Backed by the research findings
4. Realistic and implementable`,

    schema: z.object({
      immediate_actions: z.array(z.string()).describe('Actions that can be taken immediately'),
      short_term_strategies: z.array(z.string()).describe('Strategies for next 1-3 months'),
      long_term_initiatives: z.array(z.string()).describe('Long-term initiatives (6+ months)'),
      risk_considerations: z.array(z.string()).describe('Key risks to consider'),
      success_metrics: z.array(z.string()).describe('How to measure success'),
    }),
  });

  return res.object;
}
