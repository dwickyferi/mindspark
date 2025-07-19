# Adding New Models - Quick Guide

## ✨ Now you only need to edit ONE file to add new models!

### To add a new model:

1. **Open `/lib/ai/models.ts`**
2. **Add your model to the `chatModels` array:**

```typescript
{
  id: 'your-model-id',
  name: 'Display Name',
  description: 'Model description',
  provider: 'openai' | 'openrouter', // Choose the provider
  modelId: 'actual-provider-model-id', // The real model ID for the provider
  supportsTools: true, // Whether this model supports function calling
  isReasoning: false, // Whether this is a reasoning model (affects prompt)
},
```

### Example - Adding Claude 3.5 Sonnet:

```typescript
{
  id: 'claude-3.5-sonnet',
  name: 'Claude 3.5 Sonnet',
  description: 'Claude 3.5 Sonnet by Anthropic',
  provider: 'openrouter',
  modelId: 'anthropic/claude-3.5-sonnet',
  supportsTools: true,
  isReasoning: false,
},
```

### What happens automatically:

✅ **Schema validation** - Model is added to API validation  
✅ **Provider configuration** - Model is available in the provider  
✅ **Entitlements** - Model is available to users  
✅ **Tools support** - Automatically determined by `supportsTools` flag  
✅ **Reasoning logic** - Automatically determined by `isReasoning` flag

### Supported Providers:

- **`openai`** - OpenAI models (GPT-4, etc.)
- **`openrouter`** - OpenRouter models (Claude, Gemini, Llama, etc.)

### Adding new providers:

If you need a new provider, update the `getModelProvider` function in `/lib/ai/models.ts`:

```typescript
case 'anthropic':
  return anthropic(model.modelId);
```

### Environment Variables:

Make sure you have the required API keys:

- `OPENAI_API_KEY` - for OpenAI models
- `OPENROUTER_API_KEY` - for OpenRouter models

That's it! 🎉 Your new model will be available everywhere in the app.
