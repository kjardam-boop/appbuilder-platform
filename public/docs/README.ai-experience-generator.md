# AI Experience Generator - Quick Start

## ✨ What's New

You now have a **Chat-to-Webpage** system! Users ask questions in a branded chat window, and AI generates beautiful, interactive web experiences on the fly.

## 🚀 What Was Built

### 1. **Database & Content Library**
- ✅ New table: `ai_app_content_library` (with 3 seed examples)
- ✅ Stores markdown content templates
- ✅ Keyword-searchable for AI matching
- ✅ Multi-tenant with RLS policies

### 2. **Enhanced UI Components**
- ✅ **HeroBlock** - Hero sections with CTAs
- ✅ **ContentBlock** - Rich markdown rendering  
- ✅ **CTABlock** - Call-to-action sections
- ✅ **StepsBlock** - Step-by-step guides
- ✅ Existing: Card, CardsList, Table, Flow

### 3. **AI Integration**
- ✅ New MCP tool: `generate_experience`
- ✅ Searches content library by keywords
- ✅ Auto-extracts company branding
- ✅ Returns structured data for AI to convert
- ✅ Works through existing `AIMcpChatInterface`

### 4. **Auto-Rendering**
- ✅ AI returns ExperienceJSON in code block
- ✅ Chat automatically renders as interactive page
- ✅ Branded with company colors
- ✅ Responsive design with Tailwind

## 📋 How to Test

### Step 1: Apply Migration
```bash
# The migration is already created at:
# supabase/migrations/20251113073900_ai_app_content_library.sql

# Run it in your Supabase project
# It will create the table + insert 3 seed examples
```

### Step 2: Add Your Content Files (When Ready)
You mentioned you have 2 example markdown files. When you're ready:

```sql
-- Add your content like this:
INSERT INTO ai_app_content_library (
  tenant_id,
  category,
  title,
  content_markdown,
  keywords,
  metadata
) VALUES (
  NULL,  -- NULL = available to all tenants
  'integration',  -- or 'faq', 'help', 'onboarding', etc
  'Your Title Here',
  'Your markdown content here...',
  ARRAY['keyword1', 'keyword2', 'keyword3'],
  '{"author": "Your Name"}'::jsonb
);
```

### Step 3: Test in Chat
The `AIMcpChatInterface` component already exists in your app. Just ask it questions like:

- "How do I get started with the platform?"
- "How do I connect an integration?"
- "What are roles and permissions?"

AI will:
1. Call `generate_experience` tool
2. Search content library
3. Get branding colors
4. Convert markdown to beautiful UI blocks
5. Render instantly in chat

### Step 4: Try It Live
Open your existing chat interface (wherever you use `AIMcpChatInterface`):

```typescript
import { AIMcpChatInterface } from '@/components/AI/AIMcpChatInterface';

<AIMcpChatInterface 
  tenantId="your-tenant-id"
  title="AI Assistant"
  description="Ask me anything!"
/>
```

## 🎨 Component Examples

### Hero Block
```json
{
  "type": "hero",
  "headline": "Welcome to Your Platform",
  "subheadline": "Get started in minutes",
  "image_url": "https://...",
  "actions": [
    { "label": "Start Now", "action_id": "start" }
  ]
}
```

### Content Block
```json
{
  "type": "content",
  "markdown": "# Heading\n\n**Bold text** and [links](https://...)\n\n- List item 1\n- List item 2"
}
```

### Steps Block
```json
{
  "type": "steps",
  "title": "How to Setup",
  "steps": [
    { "title": "Step 1", "description": "Do this first" },
    { "title": "Step 2", "description": "Then do this" }
  ]
}
```

### CTA Block
```json
{
  "type": "cta",
  "headline": "Ready to start?",
  "description": "Join thousands of users",
  "actions": [
    { "label": "Sign Up", "action_id": "signup", "variant": "default" },
    { "label": "Learn More", "action_id": "learn", "variant": "outline" }
  ]
}
```

## 📁 Files Created

### Database
- `supabase/migrations/20251113073900_ai_app_content_library.sql`

### Frontend Components
- `src/renderer/components/HeroBlock.tsx`
- `src/renderer/components/ContentBlock.tsx`
- `src/renderer/components/CTABlock.tsx`
- `src/renderer/components/StepsBlock.tsx`
- `src/renderer/components/registry.ts` (updated)
- `src/renderer/schemas/experience.schema.ts` (updated)

### Backend
- `supabase/functions/ai-mcp-chat/index.ts` (enhanced with generate_experience tool)

### Documentation
- `docs/capabilities/ai-experience-generator.md` (comprehensive guide)

## 🔧 Adding Your Files

When you're ready to add your 2 example markdown files:

1. **Open Supabase SQL Editor**
2. **Insert like this**:
```sql
INSERT INTO ai_app_content_library (
  tenant_id,
  category,
  title,
  content_markdown,
  keywords
) VALUES 
(NULL, 'integration', 'File 1 Title', 'Your markdown here...', ARRAY['key', 'words']),
(NULL, 'faq', 'File 2 Title', 'Your markdown here...', ARRAY['key', 'words']);
```

3. **Or paste content directly to me** and I'll create the INSERT statements

## 🎯 Next Steps

### Immediate
1. ✅ Apply migration to create table
2. ⏳ Add your 2 example files to content library
3. ⏳ Test in existing chat interface
4. ⏳ Verify AI generates experiences

### Future Enhancements
- Admin UI for managing content library (CRUD operations)
- Rich text editor for markdown
- Content versioning system
- Analytics on generated experiences
- A/B testing for different content versions

## 💡 Pro Tips

1. **Keywords Matter**: Use words users will actually type
   - ✅ Good: ['password', 'reset', 'login', 'forgot']
   - ❌ Bad: ['auth_system', 'pwd_recovery']

2. **Structure Markdown Well**:
   - Use `#` for main title (converts to Hero)
   - Use `##` for sections (converts to Content)
   - Use numbered lists for steps (converts to Steps)
   - End with clear CTAs

3. **Brand Extraction**: 
   - Works automatically if tenant has theme in `tenant_themes`
   - Or pass `company_url` to extract live from website

4. **Categories**:
   - `onboarding` - First-time user guides
   - `faq` - Frequently asked questions
   - `help` - How-to articles
   - `integration` - System integration guides
   - `product` - Product features
   - `guide` - General guides
   - `tutorial` - Step-by-step tutorials

## 📚 Full Documentation

See `docs/capabilities/ai-experience-generator.md` for:
- Complete architecture details
- API reference
- Troubleshooting guide
- Security policies
- Advanced examples

## ❓ Questions?

The system is ready to use! Your existing `AIMcpChatInterface` components will automatically:
- Detect the new `generate_experience` tool
- Search your content library
- Apply branding
- Render beautiful experiences

Just add your content and start asking questions! 🚀
