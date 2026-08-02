import { describe, expect, it } from 'vitest';
import {
  hexColorsEqual,
  normalizeIdColorDraft,
  normalizeLineIdDraft,
  parseTotalLengthDraft,
} from './useDebouncedGeneratorField';

describe('control draft parsers', () => {
  it('parses total length drafts', () => {
    expect(parseTotalLengthDraft('')).toBe(0);
    expect(parseTotalLengthDraft(' 1280 ')).toBe(1280);
    expect(parseTotalLengthDraft('-3')).toBe(0);
    expect(parseTotalLengthDraft('12.9')).toBe(12);
  });

  it('normalizes line ids', () => {
    expect(normalizeLineIdDraft(' s8 ')).toBe('S8');
  });

  it('normalizes hex colors or rejects invalid', () => {
    expect(normalizeIdColorDraft('#AABBCC')).toBe('#aabbcc');
    expect(normalizeIdColorDraft('#fff')).toBeNull();
    expect(normalizeIdColorDraft('red')).toBeNull();
  });

  it('compares hex colors case-insensitively', () => {
    expect(hexColorsEqual('#AaBbCc', ' #aabbcc ')).toBe(true);
    expect(hexColorsEqual('#000000', '#ffffff')).toBe(false);
  });
});
