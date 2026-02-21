import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env before importing encryption module
vi.mock('../../src/config/env.js', () => ({
  env: {
    ENCRYPTION_KEY: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
  },
}));

import { encrypt, decrypt } from '../../src/utils/encryption.js';

describe('encryption utility', () => {
  it('round-trips a string through encrypt/decrypt', () => {
    const original = 'sf_access_token_abc123';
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(decrypt(encrypted)).toBe(original);
  });

  it('produces different ciphertexts for the same input (random IV)', () => {
    const original = 'same_token';
    const a = encrypt(original);
    const b = encrypt(original);
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe(original);
    expect(decrypt(b)).toBe(original);
  });

  it('handles empty strings', () => {
    const encrypted = encrypt('');
    expect(decrypt(encrypted)).toBe('');
  });

  it('handles long strings', () => {
    const original = 'x'.repeat(10000);
    const encrypted = encrypt(original);
    expect(decrypt(encrypted)).toBe(original);
  });

  it('throws on tampered ciphertext', () => {
    const encrypted = encrypt('test');
    const tampered = encrypted.slice(0, -2) + 'XX';
    expect(() => decrypt(tampered)).toThrow();
  });
});
