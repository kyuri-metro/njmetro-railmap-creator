import { describe, expect, it } from 'vitest';
import {
  adjustTotalLengthForTrainTypeChange,
  getBadgeCanvasSizes,
  isTrainType,
} from './trainTypeLayout';

describe('trainTypeLayout', () => {
  it('exposes canvas widths per train type', () => {
    expect(getBadgeCanvasSizes('a')).toEqual({
      currentStation: 3322,
      direction: 3972,
      route: 7412,
      height: 800,
    });
    expect(getBadgeCanvasSizes('b').route).toBe(4602);
    expect(getBadgeCanvasSizes('b').direction).toBe(4602);
    expect(getBadgeCanvasSizes('b-long').route).toBe(7924);
    expect(getBadgeCanvasSizes('suburban-d')).toEqual({
      currentStation: 2730,
      direction: 3400,
      route: 5120,
      height: 800,
    });
  });

  it('adjusts totalLength by route canvas delta and clamps at 0', () => {
    expect(adjustTotalLengthForTrainTypeChange('a', 'b', 6550)).toBe(6550 + (4602 - 7412));
    expect(adjustTotalLengthForTrainTypeChange('b', 'b-long', 3740)).toBe(3740 + 3322);
    expect(adjustTotalLengthForTrainTypeChange('a', 'b', 100)).toBe(0);
    expect(adjustTotalLengthForTrainTypeChange('a', 'a', 6550)).toBe(6550);
  });

  it('validates train type tokens', () => {
    expect(isTrainType('a')).toBe(true);
    expect(isTrainType('suburban-d')).toBe(true);
    expect(isTrainType('c')).toBe(false);
    expect(isTrainType(1)).toBe(false);
  });
});
