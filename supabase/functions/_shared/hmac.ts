/**
 * HMAC Signing Utilities for Edge Functions
 * For securing integration webhook payloads
 */

/**
 * Sign a payload with HMAC-SHA256
 * @param secret - The signing secret
 * @param body - The payload body (typically JSON stringified)
 * @returns hex-encoded HMAC signature
 */
export async function signPayload(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(body);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  
  // Convert to hex
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify HMAC signature in constant time
 * @param secret - The signing secret
 * @param body - The payload body
 * @param signature - The signature to verify (hex-encoded)
 * @returns true if signature is valid
 */
export async function verifySignature(
  secret: string,
  body: string,
  signature: string
): Promise<boolean> {
  const expected = await signPayload(secret, body);
  
  // Constant-time comparison
  if (expected.length !== signature.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }

  return mismatch === 0;
}

/**
 * Validate webhook signature from headers
 * Throws error if signature is missing or invalid
 */
export async function validateWebhookSignature(
  req: Request,
  body: string,
  supabaseClient: any,
  tenantId: string,
  provider: string = 'n8n'
): Promise<void> {
  const signature = req.headers.get('X-MCP-Signature');
  
  if (!signature) {
    throw new Error('MISSING_SIGNATURE');
  }

  // Fetch active secret for tenant/provider
  const { data: secretData, error: secretError } = await supabaseClient
    .from('mcp_tenant_secret')
    .select('secret, is_active, expires_at')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .eq('is_active', true)
    .maybeSingle();

  if (secretError || !secretData) {
    console.error(JSON.stringify({
      level: 'error',
      msg: 'mcp.secret.not_configured',
      tenant_id: tenantId,
      provider,
    }));
    throw new Error('SECRET_NOT_CONFIGURED');
  }

  // Check if secret is expired
  if (secretData.expires_at && new Date(secretData.expires_at) < new Date()) {
    console.error(JSON.stringify({
      level: 'error',
      msg: 'mcp.secret.expired',
      tenant_id: tenantId,
      provider,
    }));
    throw new Error('SECRET_EXPIRED');
  }

  // Verify signature
  const isValid = await verifySignature(secretData.secret, body, signature);

  if (!isValid) {
    console.error(JSON.stringify({
      level: 'error',
      msg: 'mcp.secret.invalid_signature_attempt',
      tenant_id: tenantId,
      provider,
      signature_provided: signature.substring(0, 8) + '...',
    }));
    throw new Error('INVALID_SIGNATURE');
  }

  console.log(JSON.stringify({
    level: 'info',
    msg: 'mcp.secret.signature_validated',
    tenant_id: tenantId,
    provider,
  }));
}
