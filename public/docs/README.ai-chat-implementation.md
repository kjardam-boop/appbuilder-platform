# AI Chat Application Implementation

## Overview

This document describes the implementation of the AI Chat application for the Lovenest platform. The AI Chat app provides tenants with an intelligent assistant that has access to platform data via MCP (Model Context Protocol) tools.

## Components

### 1. Database Migration

**File:** `supabase/migrations/20251113120000_add_ai_chat_app_definition.sql`

Creates the AI Chat app definition in the `app_definitions` table:
- **App Key:** `ai-chat`
- **App Type:** `utility`
- **Icon:** `Bot`
- **Tables:** Access to AI-related tables and shared platform data

### 2. Frontend Application Page

**File:** `src/pages/apps/AIChatApp.tsx`

The main AI Chat application page that:
- Uses `useTenantContext` to get current tenant information
- Applies tenant branding (colors, fonts) if configured
- Renders the `AIMcpChatInterface` component
- Provides tenant-specific system prompts

### 3. Route Configuration

**File:** `src/App.tsx`

Added route: `/apps/ai-chat`
- Accessible to all authenticated users
- Integrated into the existing apps routing structure

### 4. Admin Integration

**File:** `src/pages/TenantDetails.tsx`

Added "Generer AI Chat" button in the Aktive Applikasjoner section that:
- Checks if AI Chat app definition exists
- Checks if already activated for tenant
- Creates an `applications` record to activate the app
- Shows success/error messages

## Existing Infrastructure (Reused)

### Chat Interface Component
**File:** `src/components/AI/AIMcpChatInterface.tsx`
- Beautiful, reusable chat UI
- Supports message history
- Renders ExperienceJSON responses
- Applies tenant branding via CSS variables

### Chat Hook
**File:** `src/modules/core/ai/hooks/useAIMcpChat.ts`
- Manages message state
- Calls Edge Function for AI responses
- Handles errors and loading states

### Backend Edge Function
**File:** `supabase/functions/ai-mcp-chat/index.ts`
- Handles AI requests with MCP tool access
- Supports multiple AI providers (Lovable, OpenAI, etc.)
- Implements rate limiting and usage tracking
- Provides tools for:
  - Company management (list, search, get details)
  - Project management (list, get, create)
  - Task management (list, create)
  - Website scraping
  - Experience generation
  - Application listing

## User Flow

### For Tenant Admins:

1. Navigate to `/admin/tenants/{tenantId}`
2. Click "Applikasjoner" tab
3. Click "Generer AI Chat" button
4. App is activated and appears in "Aktive Applikasjoner" list
5. Click "Åpne app" to access the chat

### For End Users:

1. Navigate to `/apps/ai-chat` (or click from active applications)
2. Chat interface loads with tenant branding
3. Type questions or requests
4. AI assistant responds using MCP tools to access data
5. Can create projects, search companies, get information, etc.

## Key Features

### Tenant Isolation
- Each tenant has their own AI Chat instance
- Data access is scoped to tenant
- Usage is tracked per tenant

### MCP Tools Access
The AI assistant can:
- **Search & List:** Companies, projects, tasks, applications
- **Retrieve Details:** Full company information with metadata
- **Create Resources:** Projects and tasks
- **Web Access:** Scrape websites for external information
- **Generate Experiences:** Create visual content from library

### Branding Support
- Respects tenant branding settings
- Applies custom colors and fonts
- Consistent with tenant's visual identity

### Rate Limiting & Monitoring
- AI usage is logged per tenant
- Rate limits enforced
- Cost tracking
- Failover support to backup providers

## Configuration

### System Prompt
Each tenant gets a customized system prompt that:
- Identifies the assistant as working for the tenant
- Lists available MCP tools
- Defines communication style
- Provides guidance on generating experiences

### AI Provider Settings
Configured via:
- `tenant_integrations` table for tenant-specific AI providers
- `ai_policies` table for usage limits and controls
- Fallback to platform default (Lovable AI)

## Database Schema

### Tables Used

#### `app_definitions`
- Registers AI Chat as an available app
- Defines app metadata and capabilities

#### `applications`
- Links tenants to activated apps
- Tracks installation and activation status

#### `ai_usage_logs`
- Records AI requests and responses
- Tracks token usage and costs

#### `ai_policies`
- Defines rate limits per tenant
- Controls AI provider settings

#### `content_library`
- Stores content for experience generation
- Tenant-specific or platform-wide content

## Testing

### To Test the Implementation:

1. **Run Migration:**
   ```bash
   # Navigate to Supabase project
   psql -h <host> -U postgres -d postgres -f supabase/migrations/20251113120000_add_ai_chat_app_definition.sql
   ```

2. **Access Tenant Admin:**
   - Go to `/admin/tenants/{tenantId}`
   - Click "Applikasjoner" tab
   - Click "Generer AI Chat"

3. **Verify Activation:**
   - Check that AI Chat appears in Aktive Applikasjoner
   - Click "Åpne app" button

4. **Test Chat:**
   - Navigate to `/apps/ai-chat`
   - Send test message: "List all companies"
   - Verify AI responds with company list

5. **Test MCP Tools:**
   ```
   Example queries to test:
   - "Søk etter selskaper med navn 'Akselera'"
   - "Hent detaljert informasjon om selskap [ID]"
   - "Opprett et nytt prosjekt kalt 'Test Project'"
   - "List alle oppgaver"
   - "Hent innhold fra nettsiden akselera.no"
   ```

## Security Considerations

1. **Authentication:** All routes require authenticated user
2. **Tenant Isolation:** RLS policies ensure data segregation
3. **Rate Limiting:** Prevents abuse and controls costs
4. **API Key Security:** Stored in Supabase secrets
5. **Audit Logging:** All AI usage is logged

## Future Enhancements

### Potential Additions:
- Configuration UI for custom system prompts
- Enable/disable specific MCP tools per tenant
- Chat history persistence
- Multi-language support
- Voice input/output
- Advanced analytics dashboard
- Custom tool creation interface

## Troubleshooting

### Common Issues:

**"AI Chat app ikke funnet"**
- Run the migration to create app definition
- Check `app_definitions` table for `key='ai-chat'`

**"AI Chat er allerede aktivert"**
- App is already active for this tenant
- Check `applications` table

**Chat doesn't load**
- Verify tenant context is available
- Check console for errors
- Ensure user is authenticated

**AI doesn't respond**
- Check `ai_usage_logs` for errors
- Verify AI provider credentials
- Check rate limits in `ai_policies`

## Support

For issues or questions:
1. Check application logs
2. Review `ai_usage_logs` table
3. Contact platform administrator

## Version History

- **v1.0.0** (2025-01-13): Initial implementation
  - App definition created
  - Frontend page implemented
  - Admin activation button added
  - Full MCP tool access enabled
