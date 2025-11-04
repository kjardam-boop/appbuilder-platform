# AI Content Generation

## 📝 Overview
AI-powered content generation using Lovable Cloud's built-in AI models (Gemini and GPT). Generate text, analyze data, and create intelligent responses without requiring external API keys.

## 🎯 Use Cases
- **Text Generation**: Create descriptions, summaries, and formatted content
- **Data Analysis**: Analyze structured data and provide insights
- **Field Assistance**: Real-time AI suggestions in form fields
- **Questionnaire Generation**: Automatically create contextual questions

## 🚀 Quick Start

### Basic Text Generation
```typescript
import { useAIGeneration } from "@/modules/core/ai";

function MyComponent() {
  const { generate, isLoading } = useAIGeneration();
  
  const handleGenerate = async () => {
    const result = await generate({
      prompt: "Create a company description",
      context: { companyName: "Acme Corp" }
    });
    console.log(result);
  };
  
  return (
    <button onClick={handleGenerate} disabled={isLoading}>
      Generate with AI
    </button>
  );
}
```

## 📊 Data Model

This capability doesn't require dedicated database tables as it operates through Lovable Cloud edge functions.

## 🔌 API Reference

### React Hooks

**`useAIGeneration()`**
- **Purpose**: Generate text content using AI
- **Returns**: `{ generate, isLoading, error }`
- **Example**: See Quick Start above

**`useAIChat()`**
- **Purpose**: Multi-turn conversation with AI assistant
- **Returns**: `{ sendMessage, messages, isLoading }`
- **Example**:
```typescript
const { sendMessage, messages } = useAIChat();
await sendMessage("Explain this data");
```

**`useFieldAssist(fieldName: string)`**
- **Purpose**: Real-time AI assistance for specific form fields
- **Returns**: `{ getSuggestion, isLoading }`
- **Example**:
```typescript
const { getSuggestion } = useFieldAssist("company_description");
const suggestion = await getSuggestion(currentValue);
```

**`useAIAnalysis()`**
- **Purpose**: Analyze complex data structures
- **Returns**: `{ analyze, isLoading, result }`

### Edge Functions

**`generate-text`**
- Endpoint: `/functions/v1/generate-text`
- Generates text based on prompts and context

**`field-chat-assist`**
- Endpoint: `/functions/v1/field-chat-assist`
- Provides contextual field suggestions

**`analyze-data`**
- Endpoint: `/functions/v1/analyze-data`
- Analyzes structured data with AI

## 🔧 Configuration

### Supported Models
- `google/gemini-2.5-pro` - Best for complex reasoning
- `google/gemini-2.5-flash` - Balanced performance
- `openai/gpt-5` - Excellent all-rounder
- `openai/gpt-5-mini` - Cost-effective option

No API keys required - managed by Lovable Cloud.

## 💡 Examples

### Example 1: Generate Company Description
```typescript
import { useAIGeneration } from "@/modules/core/ai";

function CompanyForm() {
  const { generate } = useAIGeneration();
  const [description, setDescription] = useState("");
  
  const handleAIGenerate = async (companyName: string) => {
    const result = await generate({
      prompt: `Create a professional company description for ${companyName}`,
      model: "google/gemini-2.5-flash"
    });
    setDescription(result);
  };
  
  return (
    <div>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      <button onClick={() => handleAIGenerate("Acme Corp")}>
        Generate with AI
      </button>
    </div>
  );
}
```

### Example 2: AI Chat Interface
```typescript
import { AIChatInterface } from "@/modules/core/ai";

function MyPage() {
  return (
    <AIChatInterface
      context={{ projectId: "123", data: projectData }}
      systemPrompt="You are a helpful assistant for project management"
    />
  );
}
```

## 🔗 Dependencies

This capability is standalone and doesn't require other capabilities.

## 🏗️ Technical Implementation

### Frontend Files
- `src/modules/core/ai/hooks/useAIGeneration.ts`
- `src/modules/core/ai/hooks/useAIChat.ts`
- `src/modules/core/ai/hooks/useFieldAssist.ts`
- `src/modules/core/ai/hooks/useAIAnalysis.ts`
- `src/modules/core/ai/components/AIChatInterface.tsx`
- `src/modules/core/ai/components/AIGenerationButton.tsx`
- `src/modules/core/ai/services/aiService.ts`

### Backend Files
- `supabase/functions/generate-text/index.ts`
- `supabase/functions/field-chat-assist/index.ts`
- `supabase/functions/analyze-data/index.ts`

## 🔐 Security Considerations
- All AI requests are authenticated via Supabase Auth
- Rate limiting applied to prevent abuse
- No user data is stored by AI models
- Requests are logged for audit purposes

## 🐛 Troubleshooting

**Issue**: AI generation is slow
**Solution**: Use `gemini-2.5-flash` or `gpt-5-mini` for faster responses

**Issue**: Context not being used properly
**Solution**: Ensure context object is JSON-serializable

---
*Part of the Lovable Platform • Last updated: 2025-01-15*
