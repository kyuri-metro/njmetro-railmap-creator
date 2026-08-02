import { describe, expect, it } from 'vitest';
import { getLineIdBadgeWidth, resolveLineNumber } from './lineIdBadgeMetrics';
import { normalizeTransferLine, normalizeTransferLines } from './normalizeTransfer';
import { getRouteZhNameCondense } from './badgeTextCondense';

describe('lineIdBadgeMetrics', () => {
  it('resolves supported line numbers', () => {
    expect(resolveLineNumber('3')).toBe(3);
    expect(resolveLineNumber('s8')).toBe('S8');
    expect(resolveLineNumber('foo')).toBeNull();
  });

  it('returns null width for unsupported ids', () => {
    expect(getLineIdBadgeWidth('not-a-line', 100)).toBeNull();
  });

  it('returns positive width for supported ids', () => {
    expect(getLineIdBadgeWidth('3', 100)).toBeGreaterThan(0);
  });
});

describe('normalizeTransfer', () => {
  it('fills missing textColor from palette', () => {
    const line = normalizeTransferLine({ id: '1', color: '#00A9E0' });
    expect(line).not.toBeNull();
    expect(line?.color).toBe('#00a9e0');
    expect(line?.textColor).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('drops empty ids and keeps explicit textColor', () => {
    expect(normalizeTransferLine({ id: '  ', color: '#000000' })).toBeNull();
    expect(
      normalizeTransferLines([
        { id: '2', color: '#c4003a', textColor: '#EEEEEE' },
        { id: '', color: '#000000' },
      ]),
    ).toEqual([{ id: '2', color: '#c4003a', textColor: '#eeeeee' }]);
  });

  it('applies fallback color for invalid hex', () => {
    const line = normalizeTransferLine({ id: '3', color: 'red' }, { fallbackColor: '#112233' });
    expect(line?.id).toBe('3');
    expect(line?.color).toBe('#112233');
    expect(line?.textColor).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('getRouteZhNameCondense', () => {
  it('scales long names', () => {
    expect(getRouteZhNameCondense('甲').letterSpacing).toBe(4);
    expect(getRouteZhNameCondense('一二三四五六七').transform).toBe('scale(0.8, 1)');
    expect(getRouteZhNameCondense('一二三四五六七八九十ABCD').transform).toBe('scale(0.5, 1)');
  });
});
