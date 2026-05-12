import YAML from 'yaml';
import type { GeneratorState, StationItem, StationType, TrainDirection, TransferLine } from './features/generatorSlice';

export const STATION_YAML_DOCUMENT_VERSION = 1;

const STATION_TYPES = new Set<StationType>(['none', 'railway', 'airport']);

export type NjMetroSettingsYaml = {
  totalLength: number;
  direction: TrainDirection;
  currentStnId: string;
  showStationTypeIcons: boolean;
};

export type RailmapYamlImport = {
  lineId: string;
  color: string;
  njMetroSettings: NjMetroSettingsYaml;
  stations: StationItem[];
};

const normalizeHexColor = (raw: string): string => {
  const v = raw.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
    return v.toLowerCase();
  }
  return '#000000';
};

const slugId = (zh: string, en: string, index: number): string => {
  const base = (en.trim() || zh.trim()).toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (base.length > 0) {
    return base.slice(0, 48);
  }
  return `station-${index}`;
};

const sanitizeId = (raw: string): string => raw.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 64) || 'station';

const ensureUniqueIds = (stations: StationItem[]): StationItem[] => {
  const seen = new Set<string>();
  return stations.map((station, index) => {
    let id = station.id?.trim() ? station.id : slugId(station.chName, station.enName, index);
    id = sanitizeId(id);
    let n = 0;
    let candidate = id;
    while (seen.has(candidate)) {
      n += 1;
      candidate = `${id}-${n}`;
    }
    seen.add(candidate);
    return { ...station, id: candidate };
  });
};

const parseNameBlock = (raw: unknown): { zh: string; en: string } | null => {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (Array.isArray(raw)) {
    let zh = '';
    let en = '';
    for (const item of raw) {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        const o = item as Record<string, unknown>;
        if ('zh' in o && o.zh !== undefined) {
          zh = String(o.zh);
        }
        if ('en' in o && o.en !== undefined) {
          en = String(o.en);
        }
      }
    }
    return { zh, en };
  }

  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    return {
      zh: o.zh !== undefined ? String(o.zh) : '',
      en: o.en !== undefined ? String(o.en) : '',
    };
  }

  return null;
};

const parseTransferBlock = (raw: unknown): TransferLine[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  const out: TransferLine[] = [];

  for (const item of raw) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const o = item as Record<string, unknown>;
    const lineRaw = o.lineId ?? o.id;
    if (lineRaw === undefined || lineRaw === null) {
      continue;
    }
    const id = String(lineRaw).trim();
    if (!id) {
      continue;
    }
    const color = normalizeHexColor(o.color !== undefined && o.color !== null ? String(o.color) : '#000000');
    out.push({ id, color });
  }

  return out;
};

const parseType = (raw: unknown): StationType => {
  const s = String(raw ?? 'none').trim();
  if (STATION_TYPES.has(s as StationType)) {
    return s as StationType;
  }
  return 'none';
};

type ParseStationsYamlArrayResult =
  | { ok: true; stations: StationItem[] }
  | { ok: false; message: string };

const parseStationsYamlArray = (data: unknown[], errorPrefix: string): ParseStationsYamlArrayResult => {
  if (data.length === 0) {
    return { ok: false, message: `${errorPrefix}站点列表为空。` };
  }

  const stations: StationItem[] = [];

  for (let i = 0; i < data.length; i += 1) {
    const row = data[i];

    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      return { ok: false, message: `${errorPrefix}第 ${i + 1} 个站点：必须是对象。` };
    }

    const o = row as Record<string, unknown>;
    const names = parseNameBlock(o.name);

    if (!names) {
      return { ok: false, message: `${errorPrefix}第 ${i + 1} 个站点：缺少有效的 name（zh / en）。` };
    }

    const idRaw = o.id !== undefined && o.id !== null ? String(o.id).trim() : '';
    const fromRaw = idRaw ? sanitizeId(idRaw) : '';
    const id = fromRaw || slugId(names.zh, names.en, i);

    stations.push({
      id,
      chName: names.zh,
      enName: names.en,
      type: parseType(o.type),
      transfer: parseTransferBlock(o.transfer),
    });
  }

  return { ok: true, stations: ensureUniqueIds(stations) };
};

const mergeNjMetroSettings = (raw: unknown, fb: GeneratorState): NjMetroSettingsYaml => {
  const o = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

  let totalLength = fb.totalLength;
  if (typeof o.totalLength === 'number' && Number.isFinite(o.totalLength)) {
    totalLength = Math.max(0, Math.trunc(o.totalLength));
  }

  let direction: TrainDirection = fb.direction;
  if (o.direction === 'l' || o.direction === 'r') {
    direction = o.direction;
  }

  const currentStnId = typeof o.currentStnId === 'string' ? o.currentStnId : fb.currentStnId;

  const showStationTypeIcons =
    typeof o.showStationTypeIcons === 'boolean' ? o.showStationTypeIcons : fb.showStationTypeIcons;

  return { totalLength, direction, currentStnId, showStationTypeIcons };
};

const resolveCurrentStnId = (requested: string, stations: StationItem[], fallback: string): string => {
  if (stations.length === 0) {
    return '';
  }
  if (requested && stations.some((s) => s.id === requested)) {
    return requested;
  }
  if (fallback && stations.some((s) => s.id === fallback)) {
    return fallback;
  }
  return stations[0].id;
};

const stationsToYamlBodies = (stations: StationItem[]) =>
  stations.map((station) => ({
    id: station.id,
    name: [{ zh: station.chName }, { en: station.enName }],
    type: station.type,
    transfer: station.transfer.map((line) => ({
      lineId: line.id,
      color: normalizeHexColor(line.color),
    })),
  }));

export const serializeRailmapYaml = (state: GeneratorState): string => {
  const doc = {
    version: STATION_YAML_DOCUMENT_VERSION,
    lineId: state.lineId,
    color: normalizeHexColor(state.idColor),
    njMetroSettings: {
      totalLength: state.totalLength,
      direction: state.direction,
      currentStnId: state.currentStnId,
      showStationTypeIcons: state.showStationTypeIcons,
    },
    stations: stationsToYamlBodies(state.stnList),
  };

  return YAML.stringify(doc, { indent: 2, lineWidth: 0 }).trimEnd() + '\n';
};

export type ParseRailmapYamlResult = { ok: true; data: RailmapYamlImport } | { ok: false; message: string };

export const parseRailmapYaml = (text: string, fallbacks: GeneratorState): ParseRailmapYamlResult => {
  let data: unknown;

  try {
    data = YAML.parse(text.replace(/^\uFEFF/, ''));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `YAML 解析失败：${msg}` };
  }

  if (Array.isArray(data)) {
    const stationsResult = parseStationsYamlArray(data, '');
    if (!stationsResult.ok) {
      return stationsResult;
    }
    const stations = stationsResult.stations;
    const nj = mergeNjMetroSettings(undefined, fallbacks);
    return {
      ok: true,
      data: {
        lineId: fallbacks.lineId,
        color: normalizeHexColor(fallbacks.idColor),
        njMetroSettings: {
          ...nj,
          currentStnId: resolveCurrentStnId(nj.currentStnId, stations, fallbacks.currentStnId),
        },
        stations,
      },
    };
  }

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, message: '根节点必须是对象（含 version、lineId、color、njMetroSettings、stations）或旧版站点数组。' };
  }

  const root = data as Record<string, unknown>;

  if (!('stations' in root)) {
    return { ok: false, message: '缺少 stations 字段。' };
  }

  const rawStations = root.stations;
  if (!Array.isArray(rawStations)) {
    return { ok: false, message: 'stations 必须是数组。' };
  }

  const stationsResult = parseStationsYamlArray(rawStations, '');
  if (!stationsResult.ok) {
    return stationsResult;
  }
  const stations = stationsResult.stations;

  const lineIdRaw = root.lineId !== undefined && root.lineId !== null ? String(root.lineId).trim() : '';
  const lineId = lineIdRaw !== '' ? lineIdRaw : fallbacks.lineId;

  let color: string;
  if (typeof root.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(root.color.trim())) {
    color = normalizeHexColor(root.color);
  } else {
    color = normalizeHexColor(fallbacks.idColor);
  }

  const njMerged = mergeNjMetroSettings(root.njMetroSettings, fallbacks);
  const currentStnId = resolveCurrentStnId(njMerged.currentStnId, stations, fallbacks.currentStnId);

  return {
    ok: true,
    data: {
      lineId,
      color,
      njMetroSettings: { ...njMerged, currentStnId },
      stations,
    },
  };
};
