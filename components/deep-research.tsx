import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Clock, Target, TrendingUp, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeepResearchProps {
  researchId: string;
  query: string;
  analysis: {
    title: string;
    executive_summary: string;
    main_findings: string[];
    detailed_analysis: string;
    recommendations: string[];
    knowledge_gaps: string[];
    confidence_assessment: {
      reasoning: string;
      overall_confidence: number;
    };
  };
  keyLearnings: string[];
  recommendations: {
    immediate_actions: string[];
    short_term_strategies: string[];
    long_term_initiatives: string[];
    risk_considerations: string[];
    success_metrics: string[];
  };
  citations: Array<{
    title: string;
    url: string;
    content: string;
    relevance: number;
  }>;
  metadata: {
    depth_completed: number;
    breadth_completed: number;
    total_searches: number;
    duration_ms: number;
    focus_areas?: string[];
    time_scope?: string;
  };
}

export function DeepResearchResults({
  researchId,
  query,
  analysis,
  keyLearnings,
  recommendations,
  citations,
  metadata
}: DeepResearchProps) {
  const [showFullReport, setShowFullReport] = useState(false);
  const [showCitations, setShowCitations] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <CheckCircle className="size-5" />
            Deep Research Complete
          </CardTitle>
          <CardDescription className="text-blue-600">
            Query: &ldquo;{query}&rdquo;
          </CardDescription>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary">
              <Clock className="size-3 mr-1" />
              {formatDuration(metadata.duration_ms)}
            </Badge>
            <Badge variant="secondary">
              {metadata.total_searches} searches
            </Badge>
            <Badge variant="secondary">
              {citations.length} sources
            </Badge>
            {metadata.time_scope && (
              <Badge variant="secondary">
                {metadata.time_scope} timeframe
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-5 text-green-600" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{analysis.executive_summary}</p>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5 text-purple-600" />
            Main Findings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {analysis.main_findings.slice(0, 5).map((finding, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle className="size-4 text-green-500 mt-0.5 shrink-0" />
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Detailed Analysis (Expandable) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="size-5 text-blue-600" />
              Detailed Analysis
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullReport(!showFullReport)}
              className="h-8 px-2"
            >
              {showFullReport ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {showFullReport && (
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium text-sm mb-2">Detailed Analysis</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {analysis.detailed_analysis}
              </p>
            </div>
            
            {analysis.knowledge_gaps.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Knowledge Gaps</h4>
                <ul className="space-y-1">
                  {analysis.knowledge_gaps.map((gap, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-orange-500 mt-1">•</span>
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {keyLearnings.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Key Learnings</h4>
                <ul className="space-y-1">
                  {keyLearnings.slice(0, 8).map((learning, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{learning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Recommendations (Expandable) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="size-5 text-green-600" />
              Recommendations
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRecommendations(!showRecommendations)}
              className="h-8 px-2"
            >
              {showRecommendations ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {showRecommendations && (
          <CardContent className="space-y-4">
            {recommendations.immediate_actions.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-red-600">Immediate Actions</h4>
                <ul className="space-y-1">
                  {recommendations.immediate_actions.map((action, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="text-red-500 mt-1">⚡</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recommendations.short_term_strategies.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-orange-600">Short-term Strategies (1-3 months)</h4>
                <ul className="space-y-1">
                  {recommendations.short_term_strategies.map((strategy, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="text-orange-500 mt-1">📅</span>
                      <span>{strategy}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recommendations.long_term_initiatives.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-blue-600">Long-term Initiatives (6+ months)</h4>
                <ul className="space-y-1">
                  {recommendations.long_term_initiatives.map((initiative, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="text-blue-500 mt-1">🎯</span>
                      <span>{initiative}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recommendations.risk_considerations.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-amber-600">Risk Considerations</h4>
                <ul className="space-y-1">
                  {recommendations.risk_considerations.map((risk, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <AlertTriangle className="size-3 text-amber-500 mt-1 shrink-0" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {recommendations.success_metrics.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2 text-green-600">Success Metrics</h4>
                <ul className="space-y-1">
                  {recommendations.success_metrics.map((metric, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="text-green-500 mt-1">📊</span>
                      <span>{metric}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Citations (Expandable) */}
      {citations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="size-5 text-gray-600" />
                Sources & Citations ({citations.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCitations(!showCitations)}
                className="h-8 px-2"
              >
                {showCitations ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {showCitations && (
            <CardContent>
              <div className="space-y-3">
                {citations.slice(0, 15).map((citation, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm mb-1 truncate">
                          {citation.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {citation.content.substring(0, 150)}...
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Source
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Relevance: {Math.round(citation.relevance * 100)}%
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="size-8 p-0 shrink-0"
                      >
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center"
                        >
                          <ExternalLink className="size-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Research Metadata */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm">Research Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Research ID:</span>
              <p className="font-mono">{researchId.slice(0, 8)}...</p>
            </div>
            <div>
              <span className="text-muted-foreground">Depth:</span>
              <p>{metadata.depth_completed}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Breadth:</span>
              <p>{metadata.breadth_completed}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Duration:</span>
              <p>{formatDuration(metadata.duration_ms)}</p>
            </div>
          </div>
          {metadata.focus_areas && metadata.focus_areas.length > 0 && (
            <div className="mt-3">
              <span className="text-muted-foreground text-xs">Focus Areas:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {metadata.focus_areas.map((area, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
