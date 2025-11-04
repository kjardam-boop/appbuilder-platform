# MCP Step 8: Secrets & Signing Implementation

## Overview
Step 8 implements HMAC-SHA256 signing for securing tenant integration webhooks. This enables:
- Secure outbound calls to n8n (and future providers)
- Validation of inbound webhook callbacks
- Secret rotation with 60-day grace period
- Audit logging of all secret operations

## Database

### Table: `mcp_tenant_secret`
Stores per-tenant HMAC signing secrets for integration providers.

```sql
CREATE TABLE mcp_tenant_secret (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  provider TEXT NOT NULL,           -- "n8n", "pipedream", etc.
  secret TEXT NOT NULL,              -- HMAC signing secret (base64)
  created_at TIMESTAMPTZ NOT NULL,
  rotated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT NOT NULL
);
```

**Key Features:**
- Only 1 active secret per tenant/provider (enforced by unique index)
- Old secrets retained for 60 days after rotation
- RLS policies for platform admins and tenant admins

## Services

### `mcpTenantSecretService.ts`
Manages HMAC signing secrets:

```typescript
// Get active secret (throws if not configured)
const secret = await getActiveSecret(tenantId, provider);

// Create new secret (auto-deactivates old)
const newSecret = await createSecret(tenantId, provider, userId);

// Rotate secret (old expires in 60 days)
const rotated = await rotateSecret(tenantId, provider, userId);

// Deactivate specific secret
await deactivateSecret(secretId, tenantId);

// List all secrets (active + inactive)
const secrets = await listSecrets(tenantId, provider);
```

### `hmacSign.ts` (Client & Edge)
HMAC utilities available in both client and edge functions:

```typescript
// Sign payload
const signature = await signPayload(secret, bodyString);

// Verify signature (constant-time)
const isValid = await verifySignature(secret, bodyString, signature);
```

## Integration Flow

### Outbound (Client → n8n)
1. Fetch tenant secrets (API keys + signing secret)
2. Create McpClient with signing secret
3. Client signs payload and adds headers:
   - `X-MCP-Signature`: hex-encoded HMAC
   - `X-MCP-Tenant`: tenant ID
   - `X-Request-Id`: correlation UUID

### Inbound (n8n → Platform)
1. Edge function receives callback
2. Extract `X-MCP-Signature` and `X-MCP-Tenant` headers
3. Fetch active secret for tenant/provider
4. Verify signature in constant time
5. Return 401 if invalid, process if valid

## Security Features

### Secret Generation
- 32 bytes of cryptographic randomness
- Base64 encoded
- Generated via `crypto.getRandomValues()`

### Signature Algorithm
- HMAC-SHA256
- Hex-encoded output (64 chars)
- Constant-time comparison to prevent timing attacks

### Error Codes
- `SECRET_NOT_CONFIGURED` - No active secret for tenant/provider
- `SECRET_EXPIRED` - Secret past expiration date
- `INVALID_SIGNATURE` - Signature verification failed
- `MISSING_SIGNATURE` - No signature header provided

## Audit Logging

All secret operations emit structured JSON logs:

```typescript
{
  level: 'info|error',
  msg: 'mcp.secret.*',
  tenant_id: string,
  provider: string,
  secret_id?: string,
  request_id?: string
}
```

**Event Types:**
- `mcp.secret.created` - New secret created
- `mcp.secret.rotated` - Secret rotated (old expired)
- `mcp.secret.deactivated` - Secret manually disabled
- `mcp.secret.used_outbound` - Secret used to sign outbound call
- `mcp.secret.signature_validated` - Inbound signature verified
- `mcp.secret.invalid_signature_attempt` - Failed verification
- `mcp.secret.not_configured` - No secret found
- `mcp.secret.expired` - Expired secret used

## Admin API Endpoints

**NOTE:** Full UI implementation coming in Step 9. For now, use API directly.

```bash
# List secrets for tenant
GET /admin/mcp/secrets?provider=n8n

# Create new secret (auto-deactivates old)
POST /admin/mcp/secrets/create
Body: { provider: "n8n" }

# Rotate secret (60-day grace period)
POST /admin/mcp/secrets/rotate
Body: { provider: "n8n" }

# Deactivate specific secret
POST /admin/mcp/secrets/:id/deactivate
```

**Permissions:**
- `tenant_admin` - Manage own tenant's secrets
- `tenant_owner` - Manage own tenant's secrets
- `platform_owner` - Manage all secrets
- `platform_support` - Manage all secrets

## Testing

### Unit Tests
Located in `src/test/mcp/secretManagement.test.ts`:

- HMAC signature generation (deterministic)
- Different signatures for different payloads
- Different signatures for different secrets
- Valid signature verification
- Invalid signature rejection
- Tampered payload detection
- Signature length mismatch handling

Run with: `npm run test`

### Integration Testing

```bash
# 1. Create secret for tenant
curl -X POST /admin/mcp/secrets/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: acme" \
  -d '{"provider":"n8n"}'

# 2. Trigger n8n workflow (auto-signed)
curl -X POST /mcp/integrations/n8n/send_email/trigger \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: acme" \
  -d '{"to":"user@example.com"}'

# 3. n8n callback (must include valid signature)
curl -X POST /mcp/integrations/n8n/callback \
  -H "X-MCP-Signature: <hex>" \
  -H "X-MCP-Tenant: acme" \
  -d '{"request_id":"...","status":"success"}'
```

## Secret Rotation Policy

**Rotation Workflow:**
1. Call `POST /admin/mcp/secrets/rotate`
2. Old secret marked `is_active=false`, `expires_at=now()+60d`
3. New secret generated and activated
4. Both secrets valid for 60 days (grace period)
5. After 60 days, expired secrets rejected

**Best Practices:**
- Rotate secrets every 90 days
- Rotate immediately if compromised
- Monitor `mcp.secret.invalid_signature_attempt` logs
- Automated cleanup job (future step)

## Edge Function Integration

Add to edge functions for inbound webhooks:

```typescript
import { validateWebhookSignature } from '../_shared/hmac.ts';

// In handler
const body = await req.text();
const tenantId = req.headers.get('X-MCP-Tenant');

try {
  await validateWebhookSignature(
    req,
    body,
    supabaseClient,
    tenantId,
    'n8n'
  );
  // Signature valid, process webhook
} catch (err) {
  if (err.message === 'INVALID_SIGNATURE') {
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: { code: 'INVALID_SIGNATURE' } 
      }),
      { status: 401 }
    );
  }
  // Handle other errors
}
```

## Out of Scope (Future Steps)

- ❌ Full admin UI for secret management (Step 9)
- ❌ Automated secret rotation schedule
- ❌ Per-app secrets (vs. per-tenant)
- ❌ Support for multiple providers beyond n8n
- ❌ Secret encryption at rest (already handled by Supabase)
- ❌ OAuth/JWT token management
- ❌ Rate limiting per secret

## Next Steps

**Step 9: MCP UI Observer/Inspector**
- Admin UI for viewing secret history
- Visual secret rotation wizard
- Live webhook log viewer
- Signature validation testing tool
