# Web Search Implementation with Tavily

This document describes the implementation of web search capabilities in MindSpark AI Agent using Tavily API.

## Overview

The web search implementation provides two main tools:

- **webSearch**: Search the web for information on any topic
- **webExtract**: Extract detailed content from specific web pages

## Features

### Web Search Tool

- **Real-time web search** powered by Tavily API
- **Multiple search types**: General web search and news search
- **Configurable depth**: Basic for quick results, advanced for comprehensive search
- **Image integration**: Includes related images in search results
- **Time filtering**: Search within specific time ranges (day, week, month, year)
- **Domain filtering**: Include or exclude specific domains
- **Follow-up questions**: AI-generated follow-up questions based on results

### Web Extract Tool

- **Content extraction** from specific URLs
- **Multiple extraction depths**: Basic and advanced
- **Full article content** with metadata
- **Image extraction** from web pages
- **Raw content access** for detailed analysis

## Setup

### 1. API Key Configuration

Get your Tavily API key from [https://app.tavily.com/home](https://app.tavily.com/home)

Add to your `.env.local`:

```bash
TAVILY_API_KEY=your_tavily_api_key_here
```

### 2. Tool Integration

The tools are automatically integrated into the chat interface and available to all chat models except reasoning models.

## Usage

### Web Search Examples

```
"What's the latest news about AI developments?"
"Search for information about climate change solutions"
"Find recent articles about renewable energy"
```

### Web Extract Examples

```
"Extract the full content from this article: [URL]"
"Get detailed information from these research papers: [URLs]"
```

## User Interface

### Search Results Display

- **Organized cards** showing search results
- **Clickable results** that open in new tabs
- **Source information** with domain and publication date
- **Relevance scores** for each result
- **Related images** in a grid layout
- **Follow-up questions** as interactive badges

### Content Extraction Display

- **Formatted content** with proper typography
- **Source links** to original URLs
- **Scrollable content** for long articles
- **Title and metadata** display

## Technical Implementation

### Files Created/Modified

- `lib/ai/tools/web-search.ts` - Main web search tool implementation
- `components/web-search.tsx` - React components for displaying results
- `app/(chat)/api/chat/route.ts` - Tool integration
- `components/message.tsx` - Message handling for web search results
- `lib/ai/prompts.ts` - System prompts for web search guidance

### API Integration

- Uses Tavily API for search and extraction
- Proper error handling and fallbacks
- Rate limiting and usage optimization
- Secure API key management

## Error Handling

The implementation includes comprehensive error handling:

- Missing API key detection
- Rate limit handling
- Network error recovery
- Invalid URL handling
- Graceful degradation when search fails

## Best Practices

### For Users

- Use specific search queries for better results
- Combine web search with content extraction for comprehensive research
- Use time filters for recent information
- Leverage follow-up questions for deeper exploration

### For Developers

- Always validate API key presence
- Implement proper error boundaries
- Cache results when appropriate
- Monitor API usage and costs
- Keep UI responsive during search operations

## Limitations

- Requires active internet connection
- Subject to Tavily API rate limits
- Some websites may block content extraction
- Search results depend on Tavily's index freshness

## Future Enhancements

- [ ] Search result caching
- [ ] Multi-language search support
- [ ] Advanced filtering options
- [ ] Search history and favorites
- [ ] Batch URL processing
- [ ] Integration with document management

## Troubleshooting

### Common Issues

1. **No search results**: Check API key configuration
2. **Rate limit errors**: Implement request throttling
3. **Extraction failures**: Verify URL accessibility
4. **Slow responses**: Consider using basic search depth for faster results

### Debug Information

Enable debugging by checking the browser console for detailed error messages and API response information.
