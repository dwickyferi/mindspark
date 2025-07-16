'use client';

import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ExternalLink, Globe, Search, Image as ImageIcon } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

interface WebSearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

interface WebSearchImage {
  url: string;
  description?: string;
}

interface WebSearchResultProps {
  results?: WebSearchResult[];
  images?: WebSearchImage[];
  query?: string;
  summary?: string;
  follow_up_questions?: string[];
}

export const WebSearchLoading = memo(() => (
  <Card className="w-full max-w-2xl">
    <CardHeader>
      <div className="flex items-center gap-2">
        <Search className="size-5 text-blue-600" />
        <CardTitle className="text-sm">Searching the web...</CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </CardContent>
  </Card>
));

WebSearchLoading.displayName = 'WebSearchLoading';

export const WebSearchResults = memo(({ results, images, query, summary, follow_up_questions }: WebSearchResultProps) => {
  if (!results) return null;

  const handleResultClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="size-5 text-blue-600" />
          <CardTitle className="text-sm">Web Search Results</CardTitle>
        </div>
        {query && (
          <CardDescription>
            Search query: <span className="font-medium">&quot;{query}&quot;</span>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {summary && (
          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
            {summary}
          </div>
        )}

        {/* Search Results */}
        <div className="space-y-3">
          {results.map((result, index) => (
            <div
              key={index}
              className="border rounded-lg p-3 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => handleResultClick(result.url)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm line-clamp-1 hover:text-primary">
                    {result.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {result.content}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-blue-600 hover:underline">
                      {new URL(result.url).hostname}
                    </span>
                    {result.published_date && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(result.published_date).toLocaleDateString()}
                      </span>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      Score: {result.score.toFixed(2)}
                    </Badge>
                  </div>
                </div>
                <ExternalLink className="size-4 text-muted-foreground shrink-0" />
              </div>
            </div>
          ))}
        </div>

        {/* Images */}
        {images && images.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Related Images</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {images.slice(0, 6).map((image, index) => (
                <div
                  key={index}
                  className="relative group cursor-pointer"
                  onClick={() => window.open(image.url, '_blank', 'noopener,noreferrer')}
                >
                  <img
                    src={image.url}
                    alt={image.description || `Search result image ${index + 1}`}
                    className="w-full h-24 object-cover rounded-md hover:opacity-80 transition-opacity"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  {image.description && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-xs p-1 rounded-b-md line-clamp-1">
                      {image.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up Questions */}
        {follow_up_questions && follow_up_questions.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Follow-up Questions:</span>
            <div className="flex flex-wrap gap-2">
              {follow_up_questions.map((question, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {question}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

WebSearchResults.displayName = 'WebSearchResults';

export const WebExtractLoading = memo(() => (
  <Card className="w-full max-w-2xl">
    <CardHeader>
      <div className="flex items-center gap-2">
        <ExternalLink className="h-5 w-5 text-green-600" />
        <CardTitle className="text-sm">Extracting content...</CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-20 w-full" />
      </div>
    </CardContent>
  </Card>
));

WebExtractLoading.displayName = 'WebExtractLoading';

interface WebExtractResultProps {
  extracted_content?: Array<{
    url: string;
    title?: string;
    content: string;
    raw_content?: string;
  }>;
  summary?: string;
}

export const WebExtractResults = memo(({ extracted_content, summary }: WebExtractResultProps) => {
  if (!extracted_content) return null;

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ExternalLink className="size-5 text-green-600" />
          <CardTitle className="text-sm">Web Content Extraction</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary && (
          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
            {summary}
          </div>
        )}

        {extracted_content.map((item, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm">{item.title || 'Extracted Content'}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="size-3" />
              </Button>
            </div>
            <p className="text-xs text-blue-600">{new URL(item.url).hostname}</p>
            <div className="text-sm text-muted-foreground bg-muted/10 p-3 rounded-md max-h-40 overflow-y-auto">
              {item.content}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
});

WebExtractResults.displayName = 'WebExtractResults';
