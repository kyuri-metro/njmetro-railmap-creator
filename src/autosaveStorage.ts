export type AutosaveSettings = {
  intervalSeconds: number;
  maxEntries: number;
  autoFillNjmetroLineColor: boolean;
};

export type AutosaveEntry = {
  id: string;
  savedAt: number;
  yaml: string;
  summary: string;
};

const SETTINGS_KEY = 'njmetro-railmap-autosave-settings';
const ENTRIES_KEY = 'njmetro-railmap-autosave-entries';

export const DEFAULT_AUTOSAVE_SETTINGS: AutosaveSettings = {
  intervalSeconds: 300,
  maxEntries: 10,
  autoFillNjmetroLineColor: true,
};

const clampIntervalSeconds = (value: number) => {
  if (!Number.isFinite(value)) {
    return DEFAULT_AUTOSAVE_SETTINGS.intervalSeconds;
  }

  return Math.min(3600, Math.max(30, Math.trunc(value)));
};

const clampMaxEntries = (value: number) => {
  if (!Number.isFinite(value)) {
    return DEFAULT_AUTOSAVE_SETTINGS.maxEntries;
  }

  return Math.min(50, Math.max(1, Math.trunc(value)));
};

export const readAutosaveSettings = (): AutosaveSettings => {
  if (typeof window === 'undefined') {
    return DEFAULT_AUTOSAVE_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);

    if (!raw) {
      return DEFAULT_AUTOSAVE_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<AutosaveSettings>;

    return {
      intervalSeconds: clampIntervalSeconds(
        parsed.intervalSeconds ?? DEFAULT_AUTOSAVE_SETTINGS.intervalSeconds,
      ),
      maxEntries: clampMaxEntries(parsed.maxEntries ?? DEFAULT_AUTOSAVE_SETTINGS.maxEntries),
      autoFillNjmetroLineColor:
        typeof parsed.autoFillNjmetroLineColor === 'boolean'
          ? parsed.autoFillNjmetroLineColor
          : DEFAULT_AUTOSAVE_SETTINGS.autoFillNjmetroLineColor,
    };
  } catch {
    return DEFAULT_AUTOSAVE_SETTINGS;
  }
};

export const writeAutosaveSettings = (settings: AutosaveSettings) => {
  const normalized: AutosaveSettings = {
    intervalSeconds: clampIntervalSeconds(settings.intervalSeconds),
    maxEntries: clampMaxEntries(settings.maxEntries),
    autoFillNjmetroLineColor: settings.autoFillNjmetroLineColor,
  };

  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
};

export const readAutosaveEntries = (): AutosaveEntry[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ENTRIES_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is AutosaveEntry => {
        if (!item || typeof item !== 'object') {
          return false;
        }

        const entry = item as Partial<AutosaveEntry>;
        return (
          typeof entry.id === 'string' &&
          typeof entry.savedAt === 'number' &&
          typeof entry.yaml === 'string' &&
          typeof entry.summary === 'string'
        );
      })
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
};

export const writeAutosaveEntries = (entries: AutosaveEntry[]) => {
  window.localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
};

export const appendAutosaveEntry = (entry: Omit<AutosaveEntry, 'id' | 'savedAt'>, maxEntries: number) => {
  const existing = readAutosaveEntries();

  if (existing[0]?.yaml === entry.yaml) {
    return existing;
  }

  const next: AutosaveEntry[] = [
    {
      id: crypto.randomUUID(),
      savedAt: Date.now(),
      ...entry,
    },
    ...existing,
  ].slice(0, maxEntries);

  writeAutosaveEntries(next);
  return next;
};
