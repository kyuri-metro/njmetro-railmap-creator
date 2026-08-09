import { serializeRailmapYaml } from '../stationListYaml';
import { flattenStationList } from '../stationListTopology';
import { appendAutosaveEntry, readAutosaveSettings, type AutosaveSettings } from '../autosaveStorage';
import type { GeneratorState } from './generatorSlice';
type StoreLike = {
  getState: () => {
    generator: {
      present: GeneratorState;
    };
  };
};

let dirty = false;
let timerId = 0;
let activeSettings = readAutosaveSettings();
let boundStore: StoreLike | null = null;

export const markAutosaveDirty = () => {
  dirty = true;
};

export const getAutosaveDirty = () => dirty;

const buildEntrySummary = (state: GeneratorState) =>
  `${state.lineId} 号线 · ${flattenStationList(state.stnList).length} 站`;

const flushAutosave = () => {
  if (!dirty || !boundStore) {
    return;
  }

  const state = boundStore.getState().generator.present;
  const yaml = serializeRailmapYaml(state);

  appendAutosaveEntry(
    {
      yaml,
      summary: buildEntrySummary(state),
    },
    activeSettings.maxEntries,
  );

  dirty = false;
};

const rescheduleTimer = () => {
  if (timerId) {
    window.clearInterval(timerId);
  }

  timerId = window.setInterval(flushAutosave, activeSettings.intervalSeconds * 1000);
};

export const startAutosaveScheduler = (store: StoreLike) => {
  boundStore = store;
  activeSettings = readAutosaveSettings();
  rescheduleTimer();
};

export const updateAutosaveSchedulerSettings = (settings: AutosaveSettings) => {
  activeSettings = settings;
  rescheduleTimer();
};

export const stopAutosaveScheduler = () => {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = 0;
  }

  boundStore = null;
  dirty = false;
};
