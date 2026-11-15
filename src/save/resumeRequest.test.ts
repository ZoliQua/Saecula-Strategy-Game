import { describe, expect, it } from 'vitest';
import { RESUME_KEY, requestResume, takeResumeRequest, type ResumeStorage } from './resumeRequest';

function memory(): ResumeStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const broken: ResumeStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('resume request', () => {
  it('is honoured once', () => {
    const s = memory();
    expect(requestResume(s)).toBe(true);
    expect(s.data.get(RESUME_KEY)).toBe('auto');
    expect(takeResumeRequest(s)).toBe(true);
    expect(takeResumeRequest(s)).toBe(false);
  });

  it('is absent by default and ignores foreign values (which it clears)', () => {
    const s = memory();
    expect(takeResumeRequest(s)).toBe(false);
    s.data.set(RESUME_KEY, 'something');
    expect(takeResumeRequest(s)).toBe(false);
    expect(s.data.has(RESUME_KEY)).toBe(false);
  });

  it('never throws without or with a blocked storage', () => {
    expect(requestResume(null)).toBe(false);
    expect(takeResumeRequest(null)).toBe(false);
    expect(requestResume(broken)).toBe(false);
    expect(takeResumeRequest(broken)).toBe(false);
  });
});
