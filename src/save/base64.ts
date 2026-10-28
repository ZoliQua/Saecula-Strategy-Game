/*
 * Byte arrays (terrain, blocked mask, fog) as base64 text in a save
 * (CLAUDE.md §5.4). Uses btoa / atob, which browsers and Node both have.
 */

/** Characters per String.fromCharCode call (stays well under the argument limit). */
const CHUNK = 0x2000;

export function encodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** The bytes of `text`; RangeError when it is not base64 or does not hold exactly `length` bytes. */
export function decodeBytes(text: string, length: number): Uint8Array {
  let binary: string;
  try {
    binary = atob(text);
  } catch {
    throw new RangeError('Not base64 text');
  }
  if (binary.length !== length) throw new RangeError(`Expected ${length} bytes, got ${binary.length}`);
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
