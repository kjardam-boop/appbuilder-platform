# AI Module - Multi-Provider Support

## Overview

AI-modulen støtter nå flere AI-leverandører per tenant, med mulighet for hver tenant å konfigurere sin egen AI-provider og API-nøkkel.

## Supported Providers

### OpenAI
- **Model options**: `gpt-5`, `gpt-5-mini`, `gpt-5-nano`, `gpt-4.1`, `o3`, `o4-mini`
- **Features**: Chat, function calling, vision (selected models)
- **Note**: GPT-5+ modeller bruker `max_completion_tokens` og støtter ikke `temperature`

### Anthropic (Claude)
- **Model options**: `claude-sonnet-4-5`, `claude-opus-4-1`, `claude-3-7-sonnet`
- **Features**: Chat, function calling, vision, extended thinking
- **Note**: Separat system prompt format

### Google Gemini
- **Model options**: `google/gemini-2.5-pro`, `google/gemini-2.5-flash`, `google/gemini-2.5-flash-lite`
- **Features**: Chat, function calling, vision, large context windows
- **Note**: Bruker Lovable AI Gateway format

### Azure OpenAI
- **Model options**: Same as OpenAI, but deployment-based
- **Features**: Same as OpenAI, enterprise-grade
- **Note**: Requires custom endpoint URL

### Lovable AI (Default Fallback)
- **Model options**: `google/gemini-2.5-flash` (via gateway)
- **Features**: Platform-level, no tenant configuration needed
- **Note**: Used when no tenant-specific config exists

## Architecture

### Frontend (Client-side)

```typescript
import { 
  getTenantAIConfig, 
  setTenantAIConfig, 
  AIProviderType 
} from '@/modules/core/ai';

// Get current config
const config = await getTenantAIConfig(tenantId, supabase);

// Set new config
await setTenantAIConfig(
  tenantId,
  'openai',
  { model: 'gpt-5-mini-2025-08-07' },
  { apiKey: 'sk-...' },
  supabase
);
```

### Backend (Edge Functions)

```typescript
import { getTenantAIConfig, getAIProviderClient } from './tenantAIService.ts';

// Get tenant config
const tenantConfig = await getTenantAIConfig(tenantId, supabaseClient);

// Get provider client
const provider = getAIProviderClient(tenantConfig, platformApiKey);

// Execute chat
const response = await provider.chat({
  messages: [...],
  tools: [...],
});
```

## Database Schema

Tenant AI configuration is stored in `tenant_integrations` table:

```sql
-- Example: OpenAI configuration
{
  tenant_id: 'uuid',
  adapter_id: 'ai-openai',
  config: {
    model: 'gpt-5-mini-2025-08-07',
    temperature: 0.7,
    maxTokens: 4096
  },
  credentials: {
    apiKey: 'sk-...',
    baseUrl: 'https://api.openai.com/v1' // optional
  },
  is_active: true
}

-- Example: Azure OpenAI configuration
{
  tenant_id: 'uuid',
  adapter_id: 'ai-azure-openai',
  config: {
    model: 'gpt-5-deployment-name',
    maxCompletionTokens: 8192
  },
  credentials: {
    apiKey: 'azure-key',
    baseUrl: 'https://your-resource.openai.azure.com'
  },
  is_active: true
}
```

## Provider Selection Logic

1. Check `tenant_integrations` for active AI config (`adapter_id LIKE 'ai-%'`)
2. If found and has valid API key → use tenant-specific provider
3. If not found or invalid → fallback to Lovable AI (platform-level)

## Usage in Components

### MCP Chat (with tenant AI)

The `ai-mcp-chat` edge function automatically uses tenant-specific AI:

```typescript
import { useAIMcpChat } from '@/modules/core/ai';

function MyComponent() {
  const { messages, sendMessage, isLoading } = useAIMcpChat(tenantId);
  
  // Chat will use tenant's configured AI provider
  await sendMessage('List all projects');
}
```

### AI Question Generator

```typescript
import { AIQuestionGenerator } from '@/components/Admin/AIQuestionGenerator';

<AIQuestionGenerator 
  tenantId={tenantId}
  companyId={companyId}
  projectId={projectId}
/>
```

## Next Steps (Phase 2-4)

### Phase 2: Admin UI
- Create AI Provider Settings page
- Build provider configuration modals
- Add API key management UI
- Test connection functionality

### Phase 3: Usage Tracking
- Implement `ai_usage_logs` table
- Track tokens, costs per tenant
- Build usage dashboard
- Add rate limiting per plan

### Phase 4: Security & Governance
- Cost caps per tenant
- Content filtering
- Provider health monitoring
- Automatic fallback on errors

## Security Notes

- API keys stored in `tenant_integrations.credentials` (encrypted column)
- Edge functions use service role to read credentials
- Frontend never exposes API keys
- Platform-level Lovable AI key managed by environment variable

## Testing

```typescript
// Test provider connection
import { getAIProviderClient } from '@/modules/core/ai/services/tenantAIService';

const provider = getAIProviderClient(config, fallbackKey);
const isConnected = await provider.testConnection();
```

## Troubleshooting

### "Invalid AI provider credentials"
- Check API key is correct in `tenant_integrations.credentials`
- Verify provider-specific format (OpenAI: `sk-...`, Anthropic: different format)

### "AI rate limit exceeded"
- Check tenant's AI provider rate limits
- Consider implementing usage tracking (Phase 3)
- Falls back to Lovable AI if tenant key fails

### "Payment required"
- Tenant's AI provider account needs credits
- Update payment method with AI provider
- Or switch to different provider
