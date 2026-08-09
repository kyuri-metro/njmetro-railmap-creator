import { beforeEach, describe, expect, it, vi } from 'vitest';
import generatorReducer, {
  deleteStation,
  getDefaultGeneratorState,
  getEmptyGeneratorState,
  insertStation,
  replaceStations,
  reverseStnList,
  setCurrentStation,
  setDirection,
  setIdColor,
  setIdTextColor,
  setLineId,
  setShowStationTypeIcons,
  setUseCapsuleTransferMarkers,
  setTotalLength,
  setTrainType,
  updateStation,
  patchStationName,
  type GeneratorState,
  type StationItem,
} from './generatorSlice';

vi.mock('../autosaveStorage', async () => {
  const actual = await vi.importActual<typeof import('../autosaveStorage')>('../autosaveStorage');
  return {
    ...actual,
    readAutosaveSettings: vi.fn(() => ({
      intervalSeconds: 300,
      maxEntries: 10,
      autoFillNjmetroLineColor: true,
    })),
  };
});

import { readAutosaveSettings } from '../autosaveStorage';

const station = (partial: Partial<StationItem> & Pick<StationItem, 'id' | 'chName'>): StationItem => ({
  enName: partial.enName ?? partial.chName,
  type: partial.type ?? 'none',
  transfer: partial.transfer ?? [],
  ...partial,
});

describe('generatorSlice', () => {
  let state: GeneratorState;

  beforeEach(() => {
    state = getDefaultGeneratorState();
    vi.mocked(readAutosaveSettings).mockReturnValue({
      intervalSeconds: 300,
      maxEntries: 10,
      autoFillNjmetroLineColor: true,
    });
  });

  it('getEmptyGeneratorState clears stations but keeps line defaults', () => {
    const empty = getEmptyGeneratorState();
    expect(empty.stnList).toEqual([]);
    expect(empty.currentStnId).toBe('');
    expect(empty.lineId).toBe(state.lineId);
  });

  it('updates scalar fields', () => {
    state = generatorReducer(state, setTotalLength(1200));
    state = generatorReducer(state, setDirection('r'));
    state = generatorReducer(state, setIdColor('#112233'));
    state = generatorReducer(state, setIdTextColor('#aabbcc'));
    state = generatorReducer(state, setShowStationTypeIcons(true));
    state = generatorReducer(state, setUseCapsuleTransferMarkers(true));

    expect(state.totalLength).toBe(1200);
    expect(state.direction).toBe('r');
    expect(state.idColor).toBe('#112233');
    expect(state.idTextColor).toBe('#aabbcc');
    expect(state.showStationTypeIcons).toBe(true);
    expect(state.useCapsuleTransferMarkers).toBe(true);
  });

  it('setTrainType adjusts totalLength by route canvas delta', () => {
    expect(state.trainType).toBe('a');
    state = generatorReducer(state, setTotalLength(6550));
    state = generatorReducer(state, setTrainType('b'));
    expect(state.trainType).toBe('b');
    expect(state.totalLength).toBe(6550 + (4602 - 7412));

    state = generatorReducer(state, setTrainType('b-long'));
    expect(state.trainType).toBe('b-long');
    expect(state.totalLength).toBe(3740 + 3322);
  });

  it('auto-fills palette colors when setLineId and autoFill is on', () => {
    state = generatorReducer(state, setLineId('1'));
    expect(state.lineId).toBe('1');
    expect(state.idColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(state.idTextColor).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('skips palette auto-fill when setting is disabled', () => {
    vi.mocked(readAutosaveSettings).mockReturnValue({
      intervalSeconds: 300,
      maxEntries: 10,
      autoFillNjmetroLineColor: false,
    });

    const beforeColor = state.idColor;
    const beforeText = state.idTextColor;
    state = generatorReducer(state, setLineId('1'));

    expect(state.lineId).toBe('1');
    expect(state.idColor).toBe(beforeColor);
    expect(state.idTextColor).toBe(beforeText);
  });

  it('inserts, updates, deletes, and reverses stations', () => {
    const baseId = state.stnList[0].id;
    const newbie = station({ id: 'new-stop', chName: '新站', enName: 'New' });

    state = generatorReducer(
      state,
      insertStation({ position: 'after', basisId: baseId, station: newbie }),
    );
    expect(state.currentStnId).toBe('new-stop');
    expect(state.stnList.map((s) => s.id)).toContain('new-stop');

    state = generatorReducer(
      state,
      updateStation({ ...newbie, chName: '新站改', enName: 'New Renamed' }),
    );
    expect(state.stnList.find((s) => s.id === 'new-stop')?.chName).toBe('新站改');

    const beforeReverse = state.stnList.map((s) => s.id);
    state = generatorReducer(state, reverseStnList());
    expect(state.stnList.map((s) => s.id)).toEqual([...beforeReverse].reverse());

    state = generatorReducer(state, deleteStation('new-stop'));
    expect(state.stnList.some((s) => s.id === 'new-stop')).toBe(false);
    expect(state.stnList.some((s) => s.id === state.currentStnId)).toBe(true);
  });

  it('replaceStations resets current station and fills missing transfer textColor', () => {
    state = generatorReducer(
      state,
      replaceStations({
        stations: [
          station({
            id: 'a',
            chName: '甲',
            transfer: [{ id: '1', color: '#00a9e0', textColor: undefined as unknown as string }],
          }),
          station({ id: 'b', chName: '乙' }),
        ],
      }),
    );

    expect(state.currentStnId).toBe('a');
    expect(state.stnList[0].transfer[0].textColor).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('setCurrentStation updates selection', () => {
    const target = state.stnList[1]?.id ?? state.stnList[0].id;
    state = generatorReducer(state, setCurrentStation(target));
    expect(state.currentStnId).toBe(target);
  });

  it('patchStationName updates one name field', () => {
    const target = state.stnList[0];
    state = generatorReducer(
      state,
      patchStationName({ id: target.id, field: 'chName', value: '测试站' }),
    );
    state = generatorReducer(
      state,
      patchStationName({ id: target.id, field: 'enName', value: 'Test Station' }),
    );

    const next = state.stnList.find((item) => item.id === target.id);
    expect(next?.chName).toBe('测试站');
    expect(next?.enName).toBe('Test Station');
  });

  it('patchStationName no-ops for missing id or unchanged value', () => {
    const before = state;
    state = generatorReducer(
      state,
      patchStationName({ id: 'missing-id', field: 'chName', value: 'x' }),
    );
    expect(state).toBe(before);

    const target = state.stnList[0];
    state = generatorReducer(
      state,
      patchStationName({ id: target.id, field: 'chName', value: target.chName }),
    );
    expect(state.stnList[0].chName).toBe(target.chName);
  });
});
