import undoable, { ActionCreators, excludeAction } from 'redux-undo';
import { describe, expect, it } from 'vitest';
import generatorReducer, {
  getEmptyGeneratorState,
  patchStationName,
  restoreGeneratorState,
  setCurrentStation,
  setLineId,
  setTotalLength,
  updateStation,
  type StationItem,
} from './generatorSlice';
import {
  createGeneratorUndoGroupBy,
  GENERATOR_UNDO_GROUP_MS,
  getGeneratorUndoGroupBaseKey,
} from './generatorUndoConfig';

const station = (partial: Partial<StationItem> & Pick<StationItem, 'id' | 'chName'>): StationItem => ({
  enName: partial.enName ?? partial.chName,
  type: partial.type ?? 'none',
  transfer: partial.transfer ?? [],
  ...partial,
});

describe('getGeneratorUndoGroupBaseKey', () => {
  it('builds patchStationName and updateStation keys', () => {
    expect(
      getGeneratorUndoGroupBaseKey(
        patchStationName({ id: 's1', field: 'chName', value: '甲' }),
      ),
    ).toBe('patchStationName:s1:chName');

    expect(
      getGeneratorUndoGroupBaseKey(
        updateStation(station({ id: 's2', chName: '乙', type: 'railway' })),
      ),
    ).toBe('updateStation:s2');
  });

  it('groups scalar control actions by type and ignores others', () => {
    expect(getGeneratorUndoGroupBaseKey(setLineId('1'))).toBe(setLineId.type);
    expect(getGeneratorUndoGroupBaseKey(setTotalLength(100))).toBe(setTotalLength.type);
    expect(getGeneratorUndoGroupBaseKey(setCurrentStation('s1'))).toBeNull();
  });
});

describe('createGeneratorUndoGroupBy', () => {
  it('reuses a key within the window and opens a new epoch after timeout', () => {
    let now = 0;
    const groupBy = createGeneratorUndoGroupBy({
      now: () => now,
      windowMs: 800,
    });
    const action = patchStationName({ id: 's1', field: 'enName', value: 'A' });

    const first = groupBy(action);
    now = 500;
    const second = groupBy(patchStationName({ id: 's1', field: 'enName', value: 'AB' }));
    expect(second).toBe(first);

    now = 500 + GENERATOR_UNDO_GROUP_MS;
    const third = groupBy(patchStationName({ id: 's1', field: 'enName', value: 'ABC' }));
    expect(third).not.toBe(first);
    expect(third).toMatch(/^patchStationName:s1:enName#/);
  });

  it('does not merge different stations or fields', () => {
    let now = 0;
    const groupBy = createGeneratorUndoGroupBy({ now: () => now, windowMs: 800 });

    const a = groupBy(patchStationName({ id: 's1', field: 'chName', value: '甲' }));
    const b = groupBy(patchStationName({ id: 's1', field: 'enName', value: 'A' }));
    const c = groupBy(patchStationName({ id: 's2', field: 'chName', value: '乙' }));

    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(b).not.toBe(c);
  });
});

describe('undoable generator history', () => {
  const createHistoryReducer = (now: { t: number }) =>
    undoable(generatorReducer, {
      filter: excludeAction(setCurrentStation.type),
      groupBy: createGeneratorUndoGroupBy({ now: () => now.t, windowMs: 800 }),
      syncFilter: true,
    });

  it('merges consecutive same-station name patches into one undo step', () => {
    const now = { t: 0 };
    const reducer = createHistoryReducer(now);
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(
      state,
      restoreGeneratorState({
        ...getEmptyGeneratorState(),
        stnList: [station({ id: 's1', chName: '旧名', enName: 'Old' })],
        currentStnId: 's1',
      }),
    );
    state = reducer(state, ActionCreators.clearHistory());

    state = reducer(state, patchStationName({ id: 's1', field: 'chName', value: '新' }));
    now.t = 100;
    state = reducer(state, patchStationName({ id: 's1', field: 'chName', value: '新站' }));

    expect(state.past).toHaveLength(1);
    expect(state.present.stnList[0].chName).toBe('新站');

    state = reducer(state, ActionCreators.undo());
    expect(state.present.stnList[0].chName).toBe('旧名');
  });

  it('merges consecutive updateStation edits for the same station', () => {
    const now = { t: 0 };
    const reducer = createHistoryReducer(now);
    const base = station({ id: 's1', chName: '站', transfer: [] });
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(
      state,
      restoreGeneratorState({
        ...getEmptyGeneratorState(),
        stnList: [base],
        currentStnId: 's1',
      }),
    );
    state = reducer(state, ActionCreators.clearHistory());

    state = reducer(
      state,
      updateStation({
        ...base,
        transfer: [{ id: '2', color: '#00a9e0', textColor: '#ffffff' }],
      }),
    );
    now.t = 50;
    state = reducer(
      state,
      updateStation({
        ...base,
        transfer: [{ id: '2', color: '#112233', textColor: '#ffffff' }],
      }),
    );

    expect(state.past).toHaveLength(1);
    expect(state.present.stnList[0].transfer[0].color).toBe('#112233');

    state = reducer(state, ActionCreators.undo());
    expect(state.present.stnList[0].transfer).toEqual([]);
  });

  it('does not record setCurrentStation in undo history', () => {
    const now = { t: 0 };
    const reducer = createHistoryReducer(now);
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(
      state,
      restoreGeneratorState({
        ...getEmptyGeneratorState(),
        stnList: [station({ id: 'a', chName: '甲' }), station({ id: 'b', chName: '乙' })],
        currentStnId: 'a',
      }),
    );
    state = reducer(state, ActionCreators.clearHistory());

    state = reducer(state, setCurrentStation('b'));
    expect(state.present.currentStnId).toBe('b');
    expect(state.past).toHaveLength(0);
    expect(state.present.stnList[0].chName).toBe('甲');
  });

  it('keeps grouping across excluded station switches within the window', () => {
    const now = { t: 0 };
    const reducer = createHistoryReducer(now);
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(
      state,
      restoreGeneratorState({
        ...getEmptyGeneratorState(),
        stnList: [station({ id: 'a', chName: '甲' }), station({ id: 'b', chName: '乙' })],
        currentStnId: 'a',
        lineId: '3',
      }),
    );
    state = reducer(state, ActionCreators.clearHistory());

    state = reducer(state, setLineId('1'));
    now.t = 100;
    state = reducer(state, setCurrentStation('b'));
    now.t = 200;
    state = reducer(state, setLineId('2'));

    expect(state.past).toHaveLength(1);
    expect(state.present.lineId).toBe('2');
    expect(state.present.currentStnId).toBe('b');
  });
});
