import { describe, expect, it } from 'vitest';
import { isUndeterminedTrainTypeLineId, lookupLineTrainType } from './njmetroLineTrainTypes';

describe('njmetroLineTrainTypes', () => {
  it('maps known lines including suburban A/B remaps and line 7 long badge', () => {
    expect(lookupLineTrainType('1')).toEqual({ kind: 'known', trainType: 'a' });
    expect(lookupLineTrainType('s5')).toEqual({ kind: 'known', trainType: 'a' });
    expect(lookupLineTrainType('S2')).toEqual({ kind: 'known', trainType: 'b' });
    expect(lookupLineTrainType('7')).toEqual({ kind: 'known', trainType: 'b-long' });
    expect(lookupLineTrainType('S4')).toEqual({ kind: 'known', trainType: 'suburban-d' });
    expect(lookupLineTrainType('8')).toEqual({ kind: 'known', trainType: 'b' });
  });

  it('marks 16 and 18 as undetermined', () => {
    expect(lookupLineTrainType('16')).toEqual({ kind: 'undetermined' });
    expect(lookupLineTrainType('18')).toEqual({ kind: 'undetermined' });
    expect(isUndeterminedTrainTypeLineId('16')).toBe(true);
  });

  it('returns unknown for unlisted ids', () => {
    expect(lookupLineTrainType('12')).toEqual({ kind: 'unknown' });
    expect(lookupLineTrainType('')).toEqual({ kind: 'unknown' });
  });
});
