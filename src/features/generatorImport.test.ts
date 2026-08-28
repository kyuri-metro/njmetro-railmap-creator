import { describe, expect, it } from 'vitest';
import { getEmptyGeneratorState } from './generatorSlice';
import { builtinLineToGeneratorState } from './generatorImport';
import { getBadgeCanvasSizes } from '../trainTypeLayout';

describe('builtinLineToGeneratorState train type', () => {
  it('applies known train type and adjusts totalLength', () => {
    const previous = getEmptyGeneratorState();
    previous.trainType = 'a';
    previous.totalLength = 6550;

    const next = builtinLineToGeneratorState(
      '7',
      [{ id: '7-1', chName: '甲', enName: 'A', type: 'none', transfer: [] }],
      previous,
      'opened',
    );

    expect(next.trainType).toBe('b-long');
    expect(next.totalLength).toBe(
      6550 + (getBadgeCanvasSizes('b-long').route - getBadgeCanvasSizes('a').route),
    );
    expect(next.lineId).toBe('7');
    expect(next.currentStnId).toBe('7-1');
  });

  it('keeps previous train type for undetermined lines 16/18', () => {
    const previous = getEmptyGeneratorState();
    previous.trainType = 'b';
    previous.totalLength = 4000;

    const next = builtinLineToGeneratorState(
      '16',
      [{ id: '16-1', chName: '甲', enName: 'A', type: 'none', transfer: [] }],
      previous,
      'jianban',
    );

    expect(next.trainType).toBe('b');
    expect(next.totalLength).toBe(4000);
    expect(next.lineId).toBe('16');
  });
});
