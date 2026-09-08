import { describe, expect, it } from 'vitest';
import { normalizeLineIdDraft, parseTotalLengthDraft } from './useDebouncedGeneratorField';

describe('control draft parsers', () => {
  it('parses total length drafts', () => {
    expect(parseTotalLengthDraft('')).toBe(0);
    expect(parseTotalLengthDraft('1280')).toBe(1280);
  });

  it('normalizes line ids', () => {
    expect(normalizeLineIdDraft(' s8 ')).toBe('S8');
  });
});
