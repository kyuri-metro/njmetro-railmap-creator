import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./measureBadgeText', () => ({
  measureDirectionNextLabelWidth: vi.fn(() => 100),
  measureDirectionStationEnWidth: vi.fn(),
  measureDirectionStationZhWidth: vi.fn(),
  measureDirectionToLabelWidth: vi.fn(() => 120),
}));

vi.mock('./components/LineIdBadge', () => ({
  getLineIdBadgeWidth: vi.fn(() => 280),
}));

vi.mock('./directionCondenseDebug', () => ({
  logDirectionCondenseSnapshot: vi.fn(),
}));

import { getLineIdBadgeWidth } from './components/LineIdBadge';
import { resolveDirectionCondense } from './directionBadgeCondense';
import {
  measureDirectionStationEnWidth,
  measureDirectionStationZhWidth,
} from './measureBadgeText';

describe('resolveDirectionCondense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLineIdBadgeWidth).mockReturnValue(280);
    vi.mocked(measureDirectionStationZhWidth).mockImplementation(
      (name: string, _ls: number, scaleX: number) => name.length * 80 * scaleX,
    );
    vi.mocked(measureDirectionStationEnWidth).mockImplementation(
      (name: string, _ls: number, scaleX: number) => name.length * 20 * scaleX,
    );
  });

  it('keeps initial tiers when content already fits', () => {
    const result = resolveDirectionCondense({
      direction: 'l',
      lineId: '3',
      toStation: { chName: '甲', enName: 'A' },
      nextStation: { chName: '乙', enName: 'B' },
    });

    expect(result.tiers).toEqual({
      toZh: 0,
      toEn: 0,
      nextZh: 0,
      nextEn: 0,
    });
  });

  it('raises tiers via the greedy loop when width overflows', () => {
    vi.mocked(measureDirectionStationZhWidth).mockImplementation(
      (_name: string, _ls: number, scaleX: number) => 1600 * scaleX,
    );
    vi.mocked(measureDirectionStationEnWidth).mockImplementation(
      (_name: string, _ls: number, scaleX: number) => 1400 * scaleX,
    );

    const result = resolveDirectionCondense({
      direction: 'l',
      lineId: '3',
      toStation: { chName: '甲', enName: 'Alpha' },
      nextStation: { chName: '乙', enName: 'Beta' },
    });

    const raised =
      result.tiers.toZh + result.tiers.toEn + result.tiers.nextZh + result.tiers.nextEn;

    expect(raised).toBeGreaterThan(0);
  });

  it('starts Chinese names of length >= 7 at tier 1', () => {
    const result = resolveDirectionCondense({
      direction: 'r',
      lineId: '1',
      toStation: { chName: '一二三四五六七', enName: 'Short' },
      nextStation: { chName: '甲', enName: 'B' },
    });

    expect(result.tiers.toZh).toBe(1);
  });

  it('returns initial tiers when measured widths are zero', () => {
    vi.mocked(measureDirectionStationZhWidth).mockReturnValue(0);
    vi.mocked(measureDirectionStationEnWidth).mockReturnValue(0);

    const result = resolveDirectionCondense({
      direction: 'l',
      lineId: '3',
      toStation: { chName: '甲', enName: 'A' },
      nextStation: { chName: '乙', enName: 'B' },
    });

    expect(result.tiers.toZh).toBe(0);
  });
});
