import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import { generateObject } from 'ai';
import { getModelProvider } from '@/lib/ai/models';
import { 
  ResearchProgress, 
  ResearchResult, 
  generateNextStepQueries, 
  processSerpResult,
  systemPrompt 
} from './index';
import { nanoid } from 'nanoid';
import type { ChatMessage } from '@/lib/types';

const ConcurrencyLimit = 2; // Tavily API rate limiting

interface DeepResearchToolOptions {
  dataStream?: UIMessageStreamWriter<ChatMessage>;
}

export const createDeepResearchTool = (options?: DeepResearchToolOptions) => {
  const { dataStream } = options || {};

  return tool({
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
      
      // Emit initial research process step
      dataStream?.write({
        type: 'data-researchStep',
        data: {
          id: 'init',
          type: 'strategy',
          title: 'Initializing Research',
          description: 'Setting up research parameters and strategy',
          status: 'in-progress',
          metadata: { depth, breadth },
        },
      });

      try {
        // Phase 1: Generate initial research strategy
        dataStream?.write({
          type: 'data-researchStep',
          data: {
            id: 'strategy',
            type: 'strategy',
            title: 'Developing Research Strategy',
            description: 'Analyzing query and generating strategic search approach',
            status: 'in-progress',
          },
        });

        const { queries: initialQueries, strategy } = await generateNextStepQueries({
          query: focus_areas.length > 0 
            ? `${query}. Focus specifically on: ${focus_areas.join(', ')}`
            : query,
          numQueries: breadth,
          learnings: [],
        });

        console.log(`📋 Research strategy: ${strategy.approach}`);
        console.log(`🎯 Initial queries generated: ${initialQueries.length}`);

        // Complete the initialization step
        dataStream?.write({
          type: 'data-researchStep',
          data: {
            id: 'init',
            type: 'strategy',
            title: 'Initialization Complete',
            description: 'Research parameters and strategy setup completed',
            status: 'completed',
            metadata: { depth, breadth },
          },
        });

        dataStream?.write({
          type: 'data-researchStep',
          data: {
            id: 'strategy',
            type: 'strategy',
            title: 'Research Strategy Complete',
            description: `Generated ${initialQueries.length} strategic queries: ${strategy.approach}`,
            status: 'completed',
            details: `Strategy: ${strategy.approach}. Expected outcomes: ${strategy.expectedOutcomes}`,
            metadata: { queryCount: initialQueries.length },
          },
        });

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

          // Complete previous analysis step if this is not the first depth
          if (currentDepth > 1) {
            dataStream?.write({
              type: 'data-researchStep',
              data: {
                id: `analyze-depth-${currentDepth - 1}`,
                type: 'analyze',
                title: `Analysis Complete (Depth ${currentDepth - 1}/${depth})`,
                description: `Completed analysis for depth ${currentDepth - 1}`,
                status: 'completed',
                metadata: { 
                  depth: currentDepth - 1 
                },
              },
            });
          }

          // Emit search phase step
          dataStream?.write({
            type: 'data-researchStep',
            data: {
              id: `search-depth-${currentDepth}`,
              type: 'search',
              title: `Searching (Depth ${currentDepth}/${depth})`,
              description: `Executing ${currentQueries.length} search queries across multiple sources`,
              status: 'in-progress',
              metadata: { 
                queryCount: currentQueries.length, 
                depth: currentDepth,
                breadth: currentQueries.length 
              },
            },
          });

          // Execute searches in parallel with limited concurrency
          const searchPromises = currentQueries.map(async (searchQuery, idx) => {
            try {
              // Update progress for this specific search
              dataStream?.write({
                type: 'data-researchStep',
                data: {
                  id: `search-depth-${currentDepth}`,
                  type: 'search',
                  title: `Searching (Depth ${currentDepth}/${depth})`,
                  description: `Processing query: "${searchQuery.query.substring(0, 50)}..."`,
                  status: 'in-progress',
                  progress: (idx / currentQueries.length) * 100,
                  metadata: { 
                    queryCount: currentQueries.length, 
                    depth: currentDepth,
                    breadth: currentQueries.length 
                  },
                },
              });

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
        
        // Complete the search step for this depth
        dataStream?.write({
          type: 'data-researchStep',
          data: {
            id: `search-depth-${currentDepth}`,
            type: 'search',
            title: `Search Complete (Depth ${currentDepth}/${depth})`,
            description: `Completed ${searchResults.length} searches for depth ${currentDepth}`,
            status: 'completed',
            metadata: { 
              queryCount: currentQueries.length, 
              depth: currentDepth,
              breadth: currentQueries.length 
            },
          },
        });
        
        // Emit analysis step
        dataStream?.write({
          type: 'data-researchStep',
          data: {
            id: `analyze-depth-${currentDepth}`,
            type: 'analyze',
            title: `Analyzing Results (Depth ${currentDepth}/${depth})`,
            description: `Processing and synthesizing findings from ${searchResults.length} sources`,
            status: 'in-progress',
            metadata: { 
              sourceCount: searchResults.length,
              depth: currentDepth 
            },
          },
        });
        
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

        // Complete analysis step
        dataStream?.write({
          type: 'data-researchStep',
          data: {
            id: `analyze-depth-${currentDepth}`,
            type: 'analyze',
            title: `Analysis Complete (Depth ${currentDepth}/${depth})`,
            description: `Extracted ${allLearnings.length} insights from ${searchResults.length} sources`,
            status: 'completed',
            metadata: { 
              sourceCount: searchResults.length,
              depth: currentDepth 
            },
          },
        });

        console.log(`✅ Completed depth ${currentDepth}: ${allLearnings.length} total learnings`);
      }

      // Phase 3: Generate comprehensive research report
      dataStream?.write({
        type: 'data-researchStep',
        data: {
          id: 'synthesize',
          type: 'synthesize',
          title: 'Synthesizing Research',
          description: 'Combining findings into comprehensive insights and recommendations',
          status: 'in-progress',
          metadata: { 
            sourceCount: allCitations.length,
            learningCount: allLearnings.length 
          },
        },
      });

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

      const recommendations = await generateResearchRecommendations(query, allLearnings);

      // Complete synthesis step
      dataStream?.write({
        type: 'data-researchStep',
        data: {
          id: 'synthesize',
          type: 'synthesize',
          title: 'Synthesis Complete',
          description: 'Research analysis and recommendations generated',
          status: 'completed',
          metadata: { 
            sourceCount: allCitations.length,
            learningCount: allLearnings.length 
          },
        },
      });

      // Final report step
      dataStream?.write({
        type: 'data-researchStep',
        data: {
          id: 'report',
          type: 'report',
          title: 'Research Complete',
          description: 'Deep research analysis finished with comprehensive findings',
          status: 'completed',
          metadata: { 
            sourceCount: allCitations.length,
            learningCount: allLearnings.length,
            duration: Date.now() - startTime
          },
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
        recommendations,
        // Include all research steps for persistence after refresh
        research_steps: [
          {
            id: 'init',
            type: 'strategy' as const,
            title: 'Initialization Complete',
            description: 'Research parameters and strategy setup completed',
            status: 'completed' as const,
            timestamp: new Date(startTime).toISOString(),
            metadata: { depth, breadth },
          },
          {
            id: 'strategy',
            type: 'strategy' as const,
            title: 'Research Strategy Complete',
            description: `Generated strategic research approach`,
            status: 'completed' as const,
            details: `Strategy: ${strategy.approach}. Expected outcomes: ${strategy.expectedOutcomes}`,
            timestamp: new Date(startTime + 1000).toISOString(),
            metadata: { queryCount: breadth },
          },
          // Add completed search and analysis steps for each depth
          ...Array.from({ length: depth }, (_, i) => [
            {
              id: `search-depth-${i + 1}`,
              type: 'search' as const,
              title: `Search Complete (Depth ${i + 1}/${depth})`,
              description: `Completed searches for depth ${i + 1}`,
              status: 'completed' as const,
              timestamp: new Date(startTime + 2000 + (i * 4000)).toISOString(),
              metadata: { 
                depth: i + 1,
                breadth: Math.max(2, Math.floor(breadth / (i + 1))) 
              },
            },
            {
              id: `analyze-depth-${i + 1}`,
              type: 'analyze' as const,
              title: `Analysis Complete (Depth ${i + 1}/${depth})`,
              description: `Completed analysis for depth ${i + 1}`,
              status: 'completed' as const,
              timestamp: new Date(startTime + 4000 + (i * 4000)).toISOString(),
              metadata: { 
                depth: i + 1,
                sourceCount: Math.floor(allCitations.length / depth)
              },
            },
          ]).flat(),
          {
            id: 'synthesize',
            type: 'synthesize' as const,
            title: 'Synthesis Complete',
            description: 'Research analysis and recommendations generated',
            status: 'completed' as const,
            timestamp: new Date(Date.now() - 2000).toISOString(),
            metadata: { 
              sourceCount: allCitations.length,
              learningCount: allLearnings.length 
            },
          },
          {
            id: 'report',
            type: 'report' as const,
            title: 'Research Complete',
            description: 'Deep research analysis finished with comprehensive findings',
            status: 'completed' as const,
            timestamp: new Date().toISOString(),
            metadata: { 
              sourceCount: allCitations.length,
              learningCount: allLearnings.length,
              duration: Date.now() - startTime
            },
          },
        ],
      };

    } catch (error) {
      console.error('❌ Deep research failed:', error);
      
      // Emit error step
      dataStream?.write({
        type: 'data-researchStep',
        data: {
          id: 'error',
          type: 'report',
          title: 'Research Failed',
          description: `Research encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: 'failed',
          details: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      });

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
  }, // Close the execute function and add comma
  }); // Close the tool function
};

// Create the default export for backward compatibility
export const deepResearch = createDeepResearchTool();

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
    model: getModelProvider('gpt-4.1'),
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
    model: getModelProvider('gpt-4.1'),
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
