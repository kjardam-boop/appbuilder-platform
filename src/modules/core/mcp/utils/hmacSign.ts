/**
 * HMAC Signing Utilities
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
