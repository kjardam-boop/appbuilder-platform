import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signPayload, verifySignature } from '@/modules/core/mcp/utils/hmacSign';

describe('MCP Secret Management', () => {
  describe('HMAC Signing', () => {
    const testSecret = 'test-secret-key-12345';
    const testPayload = JSON.stringify({ action: 'test', data: { id: 123 } });

    it('should generate consistent signatures for same input', async () => {
      const sig1 = await signPayload(testSecret, testPayload);
      const sig2 = await signPayload(testSecret, testPayload);
      
      expect(sig1).toBe(sig2);
      expect(sig1).toHaveLength(64); // SHA-256 hex is 64 chars
    });

    it('should generate different signatures for different payloads', async () => {
      const payload1 = JSON.stringify({ action: 'test1' });
      const payload2 = JSON.stringify({ action: 'test2' });
      
      const sig1 = await signPayload(testSecret, payload1);
      const sig2 = await signPayload(testSecret, payload2);
      
      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different secrets', async () => {
      const secret1 = 'secret1';
      const secret2 = 'secret2';
      
      const sig1 = await signPayload(secret1, testPayload);
      const sig2 = await signPayload(secret2, testPayload);
      
      expect(sig1).not.toBe(sig2);
    });
  });

  describe('Signature Verification', () => {
    const testSecret = 'test-secret-key-12345';
    const testPayload = JSON.stringify({ action: 'test', data: { id: 123 } });

    it('should verify valid signature', async () => {
      const signature = await signPayload(testSecret, testPayload);
      const isValid = await verifySignature(testSecret, testPayload, signature);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', async () => {
      const signature = await signPayload(testSecret, testPayload);
      const tamperedSignature = signature.slice(0, -1) + 'x';
      
      const isValid = await verifySignature(testSecret, testPayload, tamperedSignature);
      
      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong secret', async () => {
      const signature = await signPayload(testSecret, testPayload);
      const isValid = await verifySignature('wrong-secret', testPayload, signature);
      
      expect(isValid).toBe(false);
    });

    it('should reject signature with tampered payload', async () => {
      const signature = await signPayload(testSecret, testPayload);
      const tamperedPayload = JSON.stringify({ action: 'tampered' });
      
      const isValid = await verifySignature(testSecret, tamperedPayload, signature);
      
      expect(isValid).toBe(false);
    });

    it('should handle signature length mismatch', async () => {
      const signature = await signPayload(testSecret, testPayload);
      const shortSignature = signature.slice(0, 32);
      
      const isValid = await verifySignature(testSecret, testPayload, shortSignature);
      
      expect(isValid).toBe(false);
    });
  });
});
