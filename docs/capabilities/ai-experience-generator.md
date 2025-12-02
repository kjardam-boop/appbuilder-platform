# AI Experience Generator

## 📝 Overview
Transform markdown content into dynamic, branded web experiences through AI-powered chat. Users ask questions, AI searches a content library, and generates interactive pages that render instantly - no CMS required.

## 🎯 Key Features
- **Chat-to-Page**: Ask a question → Get a branded webpage
- **Content Library**: Store markdown templates in database
- **Auto-Branding**: Extract company colors from websites
- **Component-Rich**: Hero, content, CTA, steps, cards, tables, flows
- **Real-time Rendering**: ExperienceJSON renders immediately
- **MCP Integration**: Works through existing AI-MCP chat system

## 🏗️ Architecture

### **Flow Diagram**
```
User Question
    ↓
[AIMcpChatInterface] - Branded chat window
    ↓
[generate_experience MCP tool]
    ├─ Search content_library (markdown)
    ├─ Get tenant_themes (branding)
    └─ Extract brand from company URL (if needed)
    ↓
[AI converts markdown → ExperienceJSON]
    ↓
[Returns experience-json code block]
    ↓
[Auto-renders in chat via ExperienceRenderer]
```

### **Components**

**1. Database**
- `content_library` - Markdown content templates
  - Searchable by keywords
  - Categorized (faq, help, integration, etc)
  - Tenant-specific or platform-wide

**2. Component Types**
- `hero` - Hero sections with image, headline, subheadline, CTAs
- `content` - Rich markdown rendering with proper typography
- `cta` - Call-to-action blocks with multiple buttons
- `steps` - Step-by-step guides with numbered items
- `card` - Individual cards with actions
- `cards.list` - Lists of cards (people, services, companies)
- `table` - Data tables
- `flow` - Multi-step forms with workflows

**3. MCP Tool**
- `generate_experience` - New tool in ai-mcp-chat
  - Searches content library by keywords
  - Fetches tenant theme
  - Optionally extracts brand from URL
  - Returns structured data for AI to convert

**4. Frontend**
- `ExperienceRenderer` - Renders ExperienceJSON dynamically
- `AIMcpChatInterface` - Already parses experience-json code blocks
- Component registry in `src/renderer/components/registry.ts`

## 🚀 Quick Start

### Step 1: Run Migration
```bash
# Apply database migration
# File: supabase/migrations/20251113073900_content_library.sql
# Creates content_library table with seed content
```

### Step 2: Add Content
```sql
INSERT INTO content_library (
  tenant_id,
  category,
  title,
  content_markdown,
  keywords
) VALUES (
  NULL,  -- Platform-wide
  'integration',
  'How to connect Tripletex',
  '# Tripletex Integration\n\n## Steps\n\n1. Go to Settings\n2. Click Integrations\n3. Select Tripletex',
  ARRAY['tripletex', 'integration', 'connect', 'erp']
);
```

### Step 3: Use in Chat
```typescript
import { AIMcpChatInterface } from '@/components/AI/AIMcpChatInterface';

<AIMcpChatInterface
  tenantId="your-tenant-id"
  systemPrompt="You are a helpful assistant. When users ask questions, use the generate_experience tool to create beautiful webpages from our content library."
/>
```

### Step 4: Ask Questions
User types: "How do I connect Tripletex?"

AI automatically:
1. Calls `generate_experience` tool
2. Finds relevant markdown in content library
3. Gets tenant branding
4. Converts to ExperienceJSON with appropriate blocks
5. Returns in ```experience-json code block
6. Chat interface auto-renders it as interactive page

## 📊 Data Model

### content_library
```typescript
{
  id: UUID
  tenant_id: TEXT | NULL        // NULL = platform-wide
  category: TEXT                // onboarding, faq, help, integration, product, guide, tutorial
  title: TEXT
  content_markdown: TEXT        // Full markdown content
  keywords: TEXT[]              // For AI search
  metadata: JSONB               // Flexible extras
  is_active: BOOLEAN
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
  created_by: UUID
}
```

### ExperienceJSON Schema
```typescript
{
  version: "1.0",
  layout: {
    type: "stack" | "grid",
    gap: "sm" | "md" | "lg"
  },
  theme: {
    primary: "#color",
    accent: "#color",
    surface: "#color",
    textOnSurface: "#color",
    fontStack: "font-family"
  },
  blocks: [
    { type: "hero", headline: "...", subheadline: "...", actions: [...] },
    { type: "content", markdown: "..." },
    { type: "steps", title: "...", steps: [...] },
    { type: "cta", headline: "...", actions: [...] }
  ]
}
```

## 🔌 API Reference

### MCP Tool: generate_experience

**Parameters:**
- `query` (required) - User's question or topic
- `company_url` (optional) - Company website for brand extraction
- `category` (optional) - Filter by category (faq, help, etc)

**Returns:**
```typescript
{
  success: boolean
  content_found: number
  content_items: Array<ContentItem>
  theme: ThemeTokens | null
  instructions: string  // Instructions for AI on how to convert
}
```

**Example:**
```typescript
// AI automatically calls this when user asks a question
{
  query: "How do I integrate with HubSpot?",
  category: "integration"
}

// Returns markdown content + theme
// AI then converts to ExperienceJSON
```

## 💡 Examples

### Example 1: Simple FAQ
**User asks**: "How do I reset my password?"

**AI generates**:
```json
{
  "version": "1.0",
  "layout": { "type": "stack", "gap": "md" },
  "blocks": [
    {
      "type": "hero",
      "headline": "Reset Your Password",
      "subheadline": "Follow these simple steps"
    },
    {
      "type": "steps",
      "steps": [
        { "title": "Go to Login Page", "description": "Click 'Forgot Password'" },
        { "title": "Enter Email", "description": "Type your registered email" },
        { "title": "Check Inbox", "description": "Click the reset link" }
      ]
    },
    {
      "type": "cta",
      "headline": "Need More Help?",
      "actions": [
        { "label": "Contact Support", "action_id": "contact_support" }
      ]
    }
  ]
}
```

### Example 2: Integration Guide
**User asks**: "How to connect Tripletex?"

**Content in library**:
```markdown
# Tripletex Integration

## Overview
Connect your Tripletex ERP to sync invoices and customers.

## Prerequisites
- Admin access to Tripletex
- API credentials

## Steps
1. Navigate to Settings → Integrations
2. Click "Add Integration"
3. Select Tripletex from catalog
4. Enter API Key and Consumer Token
5. Click "Test Connection"
6. Configure sync settings
```

**AI converts to**:
- Hero block for title
- Content block for overview/prerequisites
- Steps block for the numbered list
- CTA block for "Need help?" action

## 🔧 Configuration

### Content Categories
- `onboarding` - Getting started guides
- `faq` - Frequently asked questions
- `help` - How-to articles
- `integration` - System integration guides
- `product` - Product feature docs
- `guide` - General guides
- `tutorial` - Step-by-step tutorials
- `general` - Miscellaneous content

### Keyword Strategy
Use descriptive keywords for better AI matching:
```typescript
keywords: ['integration', 'tripletex', 'erp', 'connect', 'api', 'sync']
```

### Theme Extraction
Auto-extract from company website:
```typescript
// In generate_experience call
{
  query: "...",
  company_url: "https://company.com"  // Auto-extracts brand colors
}
```

## 🎨 Component Guidelines

### Hero Block
**Use for**: Page titles, main CTAs
**Best practices**:
- Keep headline under 60 chars
- Subheadline 1-2 sentences
- Max 2 action buttons

### Content Block
**Use for**: Markdown-rich content
**Best practices**:
- Well-structured with H2, H3
- Lists for scannable content
- Links to external resources

### Steps Block
**Use for**: Procedures, guides
**Best practices**:
- 3-7 steps ideal
- Each step: clear title + description
- Sequential order

### CTA Block
**Use for**: Call-to-actions, next steps
**Best practices**:
- Clear, action-oriented headline
- 1-3 buttons max
- Primary action first

## 🔐 Security

### RLS Policies
- Platform admins can manage all content
- Tenant admins can manage tenant content
- All authenticated users can view active content (for AI generation)

### Content Isolation
- Tenant-specific content only visible to that tenant
- Platform-wide content (tenant_id = NULL) visible to all
- AI search respects tenant boundaries

## 🐛 Troubleshooting

**Q: AI not finding content**
- Check keywords match user query terms
- Ensure content is marked `is_active = true`
- Verify tenant_id is NULL (platform) or matches user's tenant

**Q: Branding not applied**
- Check `tenant_themes` table has active theme
- Use `company_url` parameter to extract from website
- Fallback: AI will use default colors

**Q: Experience not rendering**
- Verify ExperienceJSON is in ```experience-json code block
- Check JSON structure matches schema
- Use browser console to see parsing errors

## 📈 Future Enhancements

### Phase 2 (Next Steps)
- [ ] Admin UI for content management
- [ ] Rich text editor for markdown
- [ ] Content versioning
- [ ] A/B testing for experiences
- [ ] Analytics on generated experiences

### Phase 3 (Advanced)
- [ ] AI learns from user interactions
- [ ] Auto-generate content from existing pages
- [ ] Multi-language support
- [ ] Custom component types per tenant
- [ ] Experience templates library

## 🔗 Related Documentation

- [AI Generation Capability](./ai-generation.md)
- [MCP Step 8: Secrets & Signing](../mcp-step8-secrets-signing.md)
- [Apps Architecture](../apps.md)
- [Tenant System](../tenants.md)

## 📝 Notes

- ExperienceRenderer already supports theme inheritance via CSS variables
- AIMcpChatInterface already parses experience-json code blocks
- Content library is separate from CMS - it's for AI-generated pages only
- Generated experiences are ephemeral (rendered in chat, not saved)
- For persistent pages, use `tenant_pages` table instead

---
*Part of the LoveNest Platform • Created: 2025-01-13*
