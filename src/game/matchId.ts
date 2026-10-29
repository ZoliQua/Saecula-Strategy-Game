/** The part of the Web Crypto API newMatchId uses. */
export interface UuidSource {
  randomUUID(): string;
}

function browserCrypto(): UuidSource | null {
  const c: unknown = globalThis.crypto;
  if (typeof c !== 'object' || c === null) return null;
  return typeof (c as Partial<UuidSource>).randomUUID === 'function' ? (c as UuidSource) : null;
}

/**
 * A new match's stable id (a v4 UUID): created when a match starts, kept
 * in its saves, and the match log's key, so one match is one record
 * however often it is saved and resumed (M7 Decision 11).
 * `crypto.randomUUID` where the browser has it (it needs a secure
 * context); otherwise a v4 UUID from `random`.
 */
export function newMatchId(source: UuidSource | null = browserCrypto(), random: () => number = Math.random): string {
  if (source) return source.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(random() * 16) & 15;
    return (ch === 'x' ? r : (r & 3) | 8).toString(16);
  });
}
