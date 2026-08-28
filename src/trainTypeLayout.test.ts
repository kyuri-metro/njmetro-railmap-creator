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
    expect(getBadgeCanvasSizes('b').route).toBe(getBadgeCanvasSizes('b').direction);
    expect(getBadgeCanvasSizes('b-long').route).toBe(
      getBadgeCanvasSizes('b').direction + getBadgeCanvasSizes('b').currentStation,
    );
    expect(getBadgeCanvasSizes('suburban-d')).toEqual({
      currentStation: 2730,
      direction: 5100,
      route: 5120,
      height: 800,
    });
  });

  it('adjusts totalLength by route canvas delta and clamps at 0', () => {
    const aRoute = getBadgeCanvasSizes('a').route;
    const bRoute = getBadgeCanvasSizes('b').route;
    const bLongRoute = getBadgeCanvasSizes('b-long').route;

    expect(adjustTotalLengthForTrainTypeChange('a', 'b', 6550)).toBe(6550 + (bRoute - aRoute));
    expect(adjustTotalLengthForTrainTypeChange('b', 'b-long', 3740)).toBe(3740 + (bLongRoute - bRoute));
    expect(adjustTotalLengthForTrainTypeChange('a', 'b', 100)).toBe(0);
    expect(adjustTotalLengthForTrainTypeChange('a', 'a', 6550)).toBe(6550);
  });

  it('validates train type tokens', () => {
    expect(isTrainType('a')).toBe(true);
    expect(isTrainType('suburban-d')).toBe(true);
    expect(isTrainType('c')).toBe(false);
    expect(isTrainType(1)).toBe(false);
  });

  it('feeds A-type layout reference canvases', async () => {
    const { directionBadgeCanvas } = await import('./directionBadgeLayout');
    const { routeBadgeCanvas } = await import('./routeBadgeLayout');
    const a = getBadgeCanvasSizes('a');

    expect(directionBadgeCanvas).toEqual({ width: a.direction, height: a.height });
    expect(routeBadgeCanvas).toEqual({ width: a.route, height: a.height });
  });
});
