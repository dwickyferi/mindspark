# MindSpark AI Agent

<p align="center">
    Your intelligent AI companion for knowledge management, organization, and conversational data interaction.
</p>

<p align="center">
  <a href="#about"><strong>About</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## About

MindSpark AI Agent is a powerful, open-source AI assistant designed to revolutionize how you interact with your knowledge and data. Built with Next.js and the AI SDK, MindSpark transforms the way you organize, search, and engage with information.

### What MindSpark Does

- **Knowledge Management**: Organize and structure your information intelligently
- **Data Conversation**: Have natural conversations with your documents, databases, and content
- **Smart Organization**: Automatically categorize and connect related information
- **Contextual Understanding**: Maintain context across conversations and data sources
- **Multi-modal Interaction**: Work with text, images, documents, and structured data

Whether you're a researcher, student, professional, or team, MindSpark helps you unlock the full potential of your data through intelligent AI-powered interactions.

## Features

### Core AI Agent Capabilities
- **Intelligent Data Processing**: Advanced text analysis, document understanding, and information extraction
- **Contextual Memory**: Maintains conversation context and learns from interactions
- **Multi-source Integration**: Connect and query multiple data sources simultaneously
- **Automated Organization**: Smart categorization and tagging of information
- **Real-time Collaboration**: Share knowledge and insights with your team

### Technical Foundation
- **[Next.js](https://nextjs.org) App Router**
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering
- **[AI SDK](https://sdk.vercel.ai/docs)**
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports xAI (default), OpenAI, Anthropic, and other model providers
- **[shadcn/ui](https://ui.shadcn.com)**
  - Modern, accessible UI components
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com)
- **Data Persistence & Storage**
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for structured data and chat history
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file and document storage
  - Vector search capabilities for semantic information retrieval
- **[Auth.js](https://authjs.dev)**
  - Secure authentication and user management
  - Organization and team collaboration features

## Model Providers

MindSpark AI Agent ships with [xAI](https://x.ai) `grok-2-1212` as the default model, optimized for knowledge processing and reasoning tasks. However, with the [AI SDK](https://sdk.vercel.ai/docs), you can easily switch between different LLM providers:

- **[OpenAI](https://openai.com)**: GPT-4, GPT-3.5-turbo for general knowledge tasks
- **[Anthropic](https://anthropic.com)**: Claude models for document analysis and reasoning
- **[Cohere](https://cohere.com/)**: Specialized in text classification and embeddings
- **[And many more](https://sdk.vercel.ai/providers/ai-sdk-providers)**: Choose the best model for your specific use case

The flexible architecture allows you to use different models for different tasks - one for conversation, another for document analysis, and another for data extraction.

## Deploy Your Own

Deploy your own MindSpark AI Agent to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot&env=AUTH_SECRET&envDescription=Learn+more+about+how+to+get+the+API+Keys+for+the+application&envLink=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot%2Fblob%2Fmain%2F.env.example&demo-title=MindSpark+AI+Agent&demo-description=An+Open-Source+AI+Agent+for+Knowledge+Management+and+Data+Interaction+Built+With+Next.js+and+the+AI+SDK.&demo-url=https%3A%2F%2Fchat.vercel.ai&products=%5B%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22ai%22%2C%22productSlug%22%3A%22grok%22%2C%22integrationSlug%22%3A%22xai%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22neon%22%2C%22integrationSlug%22%3A%22neon%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22upstash-kv%22%2C%22integrationSlug%22%3A%22upstash%22%7D%2C%7B%22type%22%3A%22blob%22%7D%5D)

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run MindSpark AI Agent locally. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

### Quick Start

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm dev
```

Your MindSpark AI Agent should now be running on [localhost:3000](http://localhost:3000).

### Getting Started with Your Data

Once running, you can:
1. **Upload documents** - Add PDFs, text files, or other documents to your knowledge base
2. **Connect data sources** - Link databases, APIs, or other information repositories
3. **Start conversations** - Ask questions about your data and get intelligent responses
4. **Organize information** - Let MindSpark automatically categorize and structure your knowledge

---

**MindSpark AI Agent** - Transform how you interact with information. Built with ❤️ using Next.js and the AI SDK.
