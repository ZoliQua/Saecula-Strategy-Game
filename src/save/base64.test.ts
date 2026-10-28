import { describe, expect, it } from 'vitest';
import { decodeBytes, encodeBytes } from './base64';

describe('base64 byte encoding', () => {
  it('round-trips a 16 384-byte array', () => {
    const bytes = new Uint8Array(16_384);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 37 + (i >> 7)) & 0xff;
    const text = encodeBytes(bytes);
    expect(typeof text).toBe('string');
    expect(decodeBytes(text, bytes.length)).toEqual(bytes);
  });

  it('round-trips the empty array', () => {
    expect(decodeBytes(encodeBytes(new Uint8Array(0)), 0)).toEqual(new Uint8Array(0));
  });

  it('throws RangeError when the decoded length is not the expected one', () => {
    const text = encodeBytes(new Uint8Array([1, 2, 3, 4]));
    expect(() => decodeBytes(text, 5)).toThrow(RangeError);
    expect(() => decodeBytes(text, 3)).toThrow(RangeError);
  });

  it('throws RangeError on text that is not base64', () => {
    expect(() => decodeBytes('not base64!', 8)).toThrow(RangeError);
  });
});
