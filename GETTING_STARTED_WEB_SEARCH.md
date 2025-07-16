# Getting Started with Web Search

## Step 1: Get Your Tavily API Key

1. Go to [https://app.tavily.com/home](https://app.tavily.com/home)
2. Sign up for a free account (1,000 requests/month free)
3. Once logged in, copy your API key

## Step 2: Configure Your Environment

1. Open your `.env.local` file in the project root
2. Add your Tavily API key:
   ```bash
   TAVILY_API_KEY=your_tavily_api_key_here
   ```
3. Save the file

## Step 3: Test the Web Search Feature

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Open your browser and go to `http://localhost:3000`

3. Try these example queries:
   - "What's the latest news about AI?"
   - "Search for information about renewable energy"
   - "Find recent developments in machine learning"

## Features Available

### Web Search Tool

- Real-time web search results
- Related images
- Follow-up questions
- Source URLs and metadata
- Relevance scoring

### Web Extract Tool

- Extract full content from URLs
- Advanced content processing
- Support for multiple URLs
- Structured output

## Example Usage

**Basic Search:**

```
User: "What's happening with AI development recently?"
Assistant: [Uses webSearch tool to find current AI news and developments]
```

**Content Extraction:**

```
User: "Extract the content from this article: https://example.com/article"
Assistant: [Uses webExtract tool to get full article content]
```

## Troubleshooting

- **No results**: Check that your API key is correctly configured
- **Rate limiting**: You have 1,000 requests/month on the free plan
- **Slow responses**: Try using basic search depth instead of advanced

## Next Steps

Once you have web search working, you can:

- Ask for current news and information
- Research topics in depth
- Get summaries of articles and documents
- Combine search results with document creation tools

The web search tools integrate seamlessly with MindSpark's other capabilities for a complete AI-powered research experience.
