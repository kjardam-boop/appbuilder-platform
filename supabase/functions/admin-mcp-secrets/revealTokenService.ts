/**
 * Reveal Token Service
 * Manages secure reveal tokens stored in database
 */

// Using 'any' for Supabase client to avoid Deno type resolution issues

/**
 * Hash token with SHA-256
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create reveal token and store in database
 */
export async function createRevealToken(
  supabase: any,
  secretId: string,
  tenantId: string,
  userId: string,
  purpose: string,
  ipAddress?: string
): Promise<string> {
  const token = crypto.randomUUID();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

  const { error } = await supabase
    .from('secret_reveal_tokens')
    .insert({
      token_hash: tokenHash,
      tenant_id: tenantId,
      user_id: userId,
      purpose,
      secret_id: secretId,
      max_uses: 1,
      expires_at: expiresAt.toISOString(),
      ip_address: ipAddress,
    });

  if (error) {
    console.error('[RevealToken] Error creating token:', error);
    throw error;
  }

  return token; // Return raw token only once
}

/**
 * Validate and consume reveal token
 * Returns secret if valid, null otherwise
 */
export async function consumeRevealToken(
  supabase: any,
  token: string,
  tenantId: string, // kept for backward compatibility; lookup no longer depends on this value
  userId: string
): Promise<string | null> {
  const tokenHash = await hashToken(token);

  // Fetch token from DB with secret (by token + user only)
  const { data: revealToken, error } = await supabase
    .from('secret_reveal_tokens')
    .select('*, mcp_tenant_secret!inner(secret, provider)')
    .eq('token_hash', tokenHash)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !revealToken) {
    console.log('[RevealToken] Token not found or error:', error?.message);
    return null;
  }

  // Check TTL
  if (new Date(revealToken.expires_at) < new Date()) {
    console.log('[RevealToken] Token expired');
    await supabase.from('secret_reveal_tokens').delete().eq('id', revealToken.id);
    return null;
  }

  // Check max uses
  if (revealToken.uses_count >= revealToken.max_uses) {
    console.log('[RevealToken] Token already consumed');
    await supabase.from('secret_reveal_tokens').delete().eq('id', revealToken.id);
    return null;
  }

  // Increment usage count
  await supabase
    .from('secret_reveal_tokens')
    .update({
      uses_count: revealToken.uses_count + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', revealToken.id);

  // Delete token if consumed
  if (revealToken.uses_count + 1 >= revealToken.max_uses) {
    await supabase.from('secret_reveal_tokens').delete().eq('id', revealToken.id);
  }

  return revealToken.mcp_tenant_secret.secret;
}
