/**
 * Rate Limiter Service
 * Prevents abuse of secret operations
 */

// Using 'any' for Supabase client to avoid Deno type resolution issues

/**
 * Check rate limit for action
 * Returns true if allowed, false if exceeded
 */
export async function checkRateLimit(
  supabase: any,
  tenantId: string,
  userId: string,
  action: string,
  limit: number = 10, // 10 per minute
  windowMinutes: number = 1
): Promise<boolean> {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - windowMinutes);

  // Try to get existing rate limit entry
  const { data, error } = await supabase
    .from('api_rate_limits')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .eq('action', action)
    .gte('window_start', windowStart.toISOString())
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('[RateLimit] Error checking limit:', error);
    throw error;
  }

  if (!data) {
    // Create new rate limit entry
    const { error: insertError } = await supabase.from('api_rate_limits').insert({
      tenant_id: tenantId,
      user_id: userId,
      action,
      window_start: new Date().toISOString(),
      request_count: 1,
    });

    if (insertError) {
      console.error('[RateLimit] Error creating limit:', insertError);
      throw insertError;
    }

    return true; // First request in window
  }

  if (data.request_count >= limit) {
    console.warn(`[RateLimit] Limit exceeded for ${userId} on ${action}`);
    return false; // Rate limit exceeded
  }

  // Increment count
  const { error: updateError } = await supabase
    .from('api_rate_limits')
    .update({
      request_count: data.request_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.id);

  if (updateError) {
    console.error('[RateLimit] Error updating limit:', updateError);
    throw updateError;
  }

  return true; // Within limit
}
