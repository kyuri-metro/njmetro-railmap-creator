import YAML from 'yaml';
import type { GeneratorState, StationItem, StationType, TrainDirection, TransferLine } from './features/generatorSlice';
import {
  DEFAULT_BRANCH_HEIGHT,
  isStationEntry,
  validateStationListTopology,
  type BranchGroup,
  type StationListEntry,
} from './stationListTopology';
import { DEFAULT_TRAIN_TYPE, isTrainType, type TrainType } from './trainTypeLayout';

export { DEFAULT_BRANCH_HEIGHT };

const STATION_TYPES = new Set<StationType>(['none', 'railway', 'airport']);

const V1_MIGRATE_DEFAULT_TEXT_COLOR = '#ffffff';

/** Kyuri naive 文档 schema（与 kyuri-naive-from-and-to-rmg 一致；导出用 https） */
const KYURI_NAIVE_SCHEMA = 'https://umamichi.moe/2026/kyuri-naive';

/** 将历史明文协议标识规范为 https，避免源码中保留 http 字面量。 */
const canonicalizeSchemaUri = (raw: string) => raw.trim().replace(/^http:\/\//i, 'https://');

type DocVersion = 1 | 2 | 3 | 4;

export type NjMetroSettingsYaml = {
  totalLength: number;
  direction: TrainDirection;
  currentStnId: string;
  showStationTypeIcons: boolean;
  useCapsuleTransferMarkers: boolean;
  trainType: TrainType;
  branchHeight: number;
};

export type RailmapYamlImport = {
  lineId: string;
  color: string;
  lineIdTextColor: string;
  njMetroSettings: NjMetroSettingsYaml;
  stations: StationListEntry[];
};

const normalizeHexColor = (raw: string): string => {
  const v = raw.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
    return v.toLowerCase();
  }
  return '#000000';
};

const isValidHex6 = (raw: unknown): raw is string =>
  typeof raw === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.trim());

const toScalarString = (raw: unknown): string | null => {
  if (typeof raw === 'string') {
    return raw;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(raw);
  }
  if (typeof raw === 'boolean') {
    return String(raw);
  }
  return null;
};

const parseYamlDocumentVersion = (raw: unknown): DocVersion | null => {
  if (raw === undefined || raw === null) {
    return 1;
  }

  if (typeof raw === 'number') {
    if (raw === 1 || raw === 2 || raw === 3 || raw === 4) {
      return raw;
    }
    return null;
  }

  if (typeof raw !== 'string') {
    return null;
  }

  const s = raw.trim();
  if (s === '1' || s === '2' || s === '3' || s === '4') {
    return Number(s) as DocVersion;
  }
  return null;
};

/**
 * version 1 文档不包含 `lineIdTextColor`、换乘 `textColor` 的语义；导入后统一按 v2 形状写入白色（`#ffffff`）。
 * 调用方传入的上述字段（若存在）一律忽略。
 */
const mapStationTransferTextColor = (station: StationItem, textColor: string): StationItem => ({
  ...station,
  transfer: station.transfer.map((line) => ({
    ...line,
    textColor,
  })),
});

const mapEntryTransferTextColor = (entry: StationListEntry, textColor: string): StationListEntry => {
  if (isStationEntry(entry)) {
    return mapStationTransferTextColor(entry, textColor);
  }
  return {
    ...entry,
    branches: entry.branches.map((branch) => branch.map((station) => mapStationTransferTextColor(station, textColor))),
  };
};

/**
 * version 1 文档不包含 `lineIdTextColor`、换乘 `textColor` 的语义；导入后统一按 v2 形状写入白色（`#ffffff`）。
 * 调用方传入的上述字段（若存在）一律忽略。
 */
export function migrateRailmapYamlV1ToV2(data: RailmapYamlImport): RailmapYamlImport {
  return {
    ...data,
    lineIdTextColor: V1_MIGRATE_DEFAULT_TEXT_COLOR,
    stations: data.stations.map((entry) => mapEntryTransferTextColor(entry, V1_MIGRATE_DEFAULT_TEXT_COLOR)),
  };
}

const slugId = (zh: string, en: string, index: number): string => {
  const base = (en.trim() || zh.trim()).toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (base.length > 0) {
    return base.slice(0, 48);
  }
  return `station-${index}`;
};

const sanitizeId = (raw: string): string => raw.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 64) || 'station';

const uniquifyStationId = (station: StationItem, index: number, seen: Set<string>): StationItem => {
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
};

const ensureUniqueIdsInEntries = (entries: StationListEntry[]): StationListEntry[] => {
  const seen = new Set<string>();
  let index = 0;
  return entries.map((entry) => {
    if (isStationEntry(entry)) {
      const next = uniquifyStationId(entry, index, seen);
      index += 1;
      return next;
    }
    return {
      ...entry,
      branches: entry.branches.map((branch) =>
        branch.map((station) => {
          const next = uniquifyStationId(station, index, seen);
          index += 1;
          return next;
        }),
      ),
    };
  });
};

const applyNameFieldsFromObject = (o: Record<string, unknown>, names: { zh: string; en: string }) => {
  const zhVal = toScalarString(o.zh);
  if (zhVal !== null) {
    names.zh = zhVal;
  }
  const enVal = toScalarString(o.en);
  if (enVal !== null) {
    names.en = enVal;
  }
};

const parseNameBlock = (raw: unknown): { zh: string; en: string } | null => {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (Array.isArray(raw)) {
    const names = { zh: '', en: '' };
    for (const item of raw) {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        applyNameFieldsFromObject(item as Record<string, unknown>, names);
      }
    }
    return names;
  }

  if (typeof raw === 'object') {
    const names = { zh: '', en: '' };
    applyNameFieldsFromObject(raw as Record<string, unknown>, names);
    return names;
  }

  return null;
};

const parseTransferLineItem = (
  o: Record<string, unknown>,
  docVersion: DocVersion,
  stationIndex: number,
): TransferLine | { ok: false; message: string } | null => {
  const lineRaw = o.lineId ?? o.id;
  const idStr = toScalarString(lineRaw);
  if (idStr === null) {
    return null;
  }
  const id = idStr.trim();
  if (!id) {
    return null;
  }
  const color = normalizeHexColor(toScalarString(o.color) ?? '#000000');

  if (docVersion >= 2) {
    const textRaw = o.textColor;
    if (!isValidHex6(textRaw)) {
      return {
        ok: false,
        message: `第 ${stationIndex + 1} 个站点：version 2 及以上要求每条换乘包含有效的 textColor（#RRGGBB）。`,
      };
    }
    return { id, color, textColor: normalizeHexColor(textRaw) };
  }

  return { id, color, textColor: V1_MIGRATE_DEFAULT_TEXT_COLOR };
};

const parseTransferBlock = (
  raw: unknown,
  docVersion: DocVersion,
  stationIndex: number,
): TransferLine[] | { ok: false; message: string } => {
  if (!Array.isArray(raw)) {
    return [];
  }

  const out: TransferLine[] = [];

  for (const item of raw) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }
    const parsed = parseTransferLineItem(item as Record<string, unknown>, docVersion, stationIndex);
    if (parsed === null) {
      continue;
    }
    if ('ok' in parsed) {
      return parsed;
    }
    out.push(parsed);
  }

  return out;
};

const parseType = (raw: unknown): StationType => {
  const s = (toScalarString(raw) ?? 'none').trim();
  if (STATION_TYPES.has(s as StationType)) {
    return s as StationType;
  }
  return 'none';
};

type ParseStationsYamlArrayResult =
  | { ok: true; stations: StationListEntry[] }
  | { ok: false; message: string };

type ParseStationObjectResult = { ok: true; station: StationItem } | { ok: false; message: string };

const parseStationObject = (
  o: Record<string, unknown>,
  docVersion: DocVersion,
  errorLabel: string,
  indexForSlug: number,
): ParseStationObjectResult => {
  const names = parseNameBlock(o.name);

  if (!names) {
    return { ok: false, message: `${errorLabel}：缺少有效的 name（zh / en）。` };
  }

  const idScalar = toScalarString(o.id);
  const idRaw = idScalar !== null ? idScalar.trim() : '';
  const fromRaw = idRaw ? sanitizeId(idRaw) : '';
  const id = fromRaw || slugId(names.zh, names.en, indexForSlug);

  const transferResult = parseTransferBlock(o.transfer, docVersion, indexForSlug);
  if (!Array.isArray(transferResult)) {
    return transferResult;
  }

  return {
    ok: true,
    station: {
      id,
      chName: names.zh,
      enName: names.en,
      type: parseType(o.type),
      transfer: transferResult,
    },
  };
};

const parseStationListArray = (
  data: unknown[],
  docVersion: DocVersion,
  errorPrefix: string,
): { ok: true; stations: StationItem[] } | { ok: false; message: string } => {
  const stations: StationItem[] = [];

  for (let i = 0; i < data.length; i += 1) {
    const row = data[i];
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      return { ok: false, message: `${errorPrefix}第 ${i + 1} 个站点：必须是对象。` };
    }
    if ('branches' in (row as object)) {
      return { ok: false, message: `${errorPrefix}第 ${i + 1} 项：不允许嵌套 branches。` };
    }
    const parsed = parseStationObject(row as Record<string, unknown>, docVersion, `${errorPrefix}第 ${i + 1} 个站点`, i);
    if (!parsed.ok) {
      return parsed;
    }
    stations.push(parsed.station);
  }

  return { ok: true, stations };
};

const parseBranchGroupObject = (
  o: Record<string, unknown>,
  docVersion: DocVersion,
  entryIndex: number,
): { ok: true; group: BranchGroup } | { ok: false; message: string } => {
  if (!Array.isArray(o.branches)) {
    return { ok: false, message: `第 ${entryIndex + 1} 项：branches 必须是数组。` };
  }

  if (typeof o.main !== 'number' || !Number.isInteger(o.main)) {
    return { ok: false, message: `第 ${entryIndex + 1} 项：main 必须是整数。` };
  }

  const branches: StationItem[][] = [];
  for (let branchIndex = 0; branchIndex < o.branches.length; branchIndex += 1) {
    const branchRaw = o.branches[branchIndex];
    if (!Array.isArray(branchRaw)) {
      return { ok: false, message: `第 ${entryIndex + 1} 项：branches[${branchIndex}] 必须是站点数组。` };
    }
    const parsed = parseStationListArray(
      branchRaw,
      docVersion,
      `第 ${entryIndex + 1} 项 branches[${branchIndex}] `,
    );
    if (!parsed.ok) {
      return parsed;
    }
    branches.push(parsed.stations);
  }

  return {
    ok: true,
    group: {
      branches,
      main: o.main,
    },
  };
};

const parseStationsYamlArray = (
  data: unknown[],
  errorPrefix: string,
  docVersion: DocVersion,
): ParseStationsYamlArrayResult => {
  if (data.length === 0) {
    return { ok: false, message: `${errorPrefix}站点列表为空。` };
  }

  const stations: StationListEntry[] = [];

  for (let i = 0; i < data.length; i += 1) {
    const row = data[i];

    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      return { ok: false, message: `${errorPrefix}第 ${i + 1} 个站点：必须是对象。` };
    }

    const o = row as Record<string, unknown>;

    if ('branches' in o) {
      if (docVersion < 4) {
        return {
          ok: false,
          message: `${errorPrefix}第 ${i + 1} 项：branches 仅在 version 4 中受支持。`,
        };
      }
      const groupResult = parseBranchGroupObject(o, docVersion, i);
      if (!groupResult.ok) {
        return groupResult;
      }
      stations.push(groupResult.group);
      continue;
    }

    const parsed = parseStationObject(o, docVersion, `${errorPrefix}第 ${i + 1} 个站点`, i);
    if (!parsed.ok) {
      return parsed;
    }
    stations.push(parsed.station);
  }

  const unique = ensureUniqueIdsInEntries(stations);

  if (docVersion >= 4) {
    const topology = validateStationListTopology(unique);
    if (!topology.ok) {
      return { ok: false, message: `${errorPrefix}拓扑无效：${topology.error}` };
    }
  }

  return { ok: true, stations: unique };
};

const parseBranchHeight = (raw: unknown): number => {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.trunc(raw));
  }
  return DEFAULT_BRANCH_HEIGHT;
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

  // 旧版 YAML 不存在的外观选项：缺省保持旧版外观，不继承当前编辑器状态。
  const showStationTypeIcons = typeof o.showStationTypeIcons === 'boolean' ? o.showStationTypeIcons : false;
  const useCapsuleTransferMarkers =
    typeof o.useCapsuleTransferMarkers === 'boolean' ? o.useCapsuleTransferMarkers : false;
  const trainType = isTrainType(o.trainType) ? o.trainType : DEFAULT_TRAIN_TYPE;
  const branchHeight = 'branchHeight' in o ? parseBranchHeight(o.branchHeight) : DEFAULT_BRANCH_HEIGHT;

  return {
    totalLength,
    direction,
    currentStnId,
    showStationTypeIcons,
    useCapsuleTransferMarkers,
    trainType,
    branchHeight,
  };
};

/** version 3/4：`njMetroSettings` 仅含南京特有项（不含 direction、currentStnId） */
const mergeNjMetroSettingsV3Partial = (
  raw: unknown,
  fb: GeneratorState,
): Pick<
  NjMetroSettingsYaml,
  'totalLength' | 'showStationTypeIcons' | 'useCapsuleTransferMarkers' | 'trainType' | 'branchHeight'
> => {
  const o = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

  let totalLength = fb.totalLength;
  if (typeof o.totalLength === 'number' && Number.isFinite(o.totalLength)) {
    totalLength = Math.max(0, Math.trunc(o.totalLength));
  }

  // 旧版 YAML 不存在的外观选项：缺省保持旧版外观，不继承当前编辑器状态。
  const showStationTypeIcons = typeof o.showStationTypeIcons === 'boolean' ? o.showStationTypeIcons : false;
  const useCapsuleTransferMarkers =
    typeof o.useCapsuleTransferMarkers === 'boolean' ? o.useCapsuleTransferMarkers : false;
  const trainType = isTrainType(o.trainType) ? o.trainType : DEFAULT_TRAIN_TYPE;
  const branchHeight = 'branchHeight' in o ? parseBranchHeight(o.branchHeight) : DEFAULT_BRANCH_HEIGHT;

  return { totalLength, showStationTypeIcons, useCapsuleTransferMarkers, trainType, branchHeight };
};

const resolveCurrentStnId = (requested: string, stations: StationListEntry[], fallback: string): string => {
  const flat = stations.flatMap((entry) => (isStationEntry(entry) ? [entry] : entry.branches.flat()));
  if (flat.length === 0) {
    return '';
  }
  if (requested && flat.some((s) => s.id === requested)) {
    return requested;
  }
  if (fallback && flat.some((s) => s.id === fallback)) {
    return fallback;
  }
  return flat[0].id;
};

const stationToYamlBody = (station: StationItem) => ({
  id: station.id,
  name: [{ zh: station.chName }, { en: station.enName }],
  type: station.type,
  transfer: station.transfer.map((line) => ({
    lineId: line.id,
    color: normalizeHexColor(line.color),
    textColor: normalizeHexColor(line.textColor),
  })),
});

const entriesToYamlBodies = (entries: StationListEntry[]) =>
  entries.map((entry) => {
    if (isStationEntry(entry)) {
      return stationToYamlBody(entry);
    }
    return {
      branches: entry.branches.map((branch) => branch.map(stationToYamlBody)),
      main: entry.main,
    };
  });

export const serializeRailmapYaml = (state: GeneratorState): string => {
  const doc = {
    version: 4,
    schema: KYURI_NAIVE_SCHEMA,
    direction: state.direction,
    currentStnId: state.currentStnId,
    lineId: state.lineId,
    color: normalizeHexColor(state.idColor),
    textColor: normalizeHexColor(state.idTextColor),
    njMetroSettings: {
      totalLength: state.totalLength,
      showStationTypeIcons: state.showStationTypeIcons,
      useCapsuleTransferMarkers: state.useCapsuleTransferMarkers,
      trainType: state.trainType,
      branchHeight: state.branchHeight,
    },
    stations: entriesToYamlBodies(state.stnList),
  };

  return YAML.stringify(doc, { indent: 2, lineWidth: 0 }).trimEnd() + '\n';
};

export type ParseRailmapYamlResult = { ok: true; data: RailmapYamlImport } | { ok: false; message: string };

const parseRailmapYamlArrayRoot = (
  data: unknown[],
  fallbacks: GeneratorState,
): ParseRailmapYamlResult => {
  const stationsResult = parseStationsYamlArray(data, '', 1);
  if (!stationsResult.ok) {
    return stationsResult;
  }
  const stations = stationsResult.stations;
  const nj = mergeNjMetroSettings(undefined, fallbacks);
  const base: RailmapYamlImport = {
    lineId: fallbacks.lineId,
    color: normalizeHexColor(fallbacks.idColor),
    lineIdTextColor: '',
    njMetroSettings: {
      ...nj,
      currentStnId: resolveCurrentStnId(nj.currentStnId, stations, fallbacks.currentStnId),
    },
    stations,
  };
  return { ok: true, data: migrateRailmapYamlV1ToV2(base) };
};

const resolveRootColor = (root: Record<string, unknown>, fallbacks: GeneratorState): string => {
  if (typeof root.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(root.color.trim())) {
    return normalizeHexColor(root.color);
  }
  return normalizeHexColor(fallbacks.idColor);
};

const resolveLineIdTextColor = (
  root: Record<string, unknown>,
  docVersion: DocVersion,
): string | ParseRailmapYamlResult => {
  if (docVersion === 1) {
    return '';
  }
  if (docVersion >= 3) {
    if (!isValidHex6(root.textColor)) {
      return {
        ok: false,
        message: `version ${docVersion} 要求根字段 textColor（#RRGGBB）。`,
      };
    }
    return normalizeHexColor(root.textColor);
  }
  if (!isValidHex6(root.lineIdTextColor)) {
    return { ok: false, message: 'version 2 要求根字段 lineIdTextColor（#RRGGBB）。' };
  }
  return normalizeHexColor(root.lineIdTextColor);
};

const parseRailmapYamlV3OrV4 = (
  root: Record<string, unknown>,
  fallbacks: GeneratorState,
  lineId: string,
  color: string,
  lineIdTextColor: string,
  stations: StationListEntry[],
): ParseRailmapYamlResult => {
  const schemaStr = typeof root.schema === 'string' ? root.schema.trim() : '';
  if (schemaStr && canonicalizeSchemaUri(schemaStr) !== KYURI_NAIVE_SCHEMA) {
    return {
      ok: false,
      message: `schema 与预期不符：期望 ${KYURI_NAIVE_SCHEMA}（或兼容的旧协议写法），实际为 ${schemaStr}`,
    };
  }

  const partial = mergeNjMetroSettingsV3Partial(root.njMetroSettings, fallbacks);

  let direction: TrainDirection = fallbacks.direction;
  if (root.direction === 'l' || root.direction === 'r') {
    direction = root.direction;
  }

  let currentFromRoot = typeof root.currentStnId === 'string' ? root.currentStnId.trim() : '';
  const njRaw = root.njMetroSettings;
  if (!currentFromRoot && njRaw !== null && typeof njRaw === 'object' && !Array.isArray(njRaw)) {
    const legacyCurrentStnId = (njRaw as Record<string, unknown>).currentStnId;
    if (typeof legacyCurrentStnId === 'string') {
      currentFromRoot = legacyCurrentStnId.trim();
    }
  }

  const currentStnId = resolveCurrentStnId(
    currentFromRoot || fallbacks.currentStnId,
    stations,
    fallbacks.currentStnId,
  );

  return {
    ok: true,
    data: {
      lineId,
      color,
      lineIdTextColor,
      njMetroSettings: {
        ...partial,
        direction,
        currentStnId,
      },
      stations,
    },
  };
};

export const parseRailmapYaml = (text: string, fallbacks: GeneratorState): ParseRailmapYamlResult => {
  let data: unknown;

  try {
    data = YAML.parse(text.replace(/^\uFEFF/, ''));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `YAML 解析失败：${msg}` };
  }

  if (Array.isArray(data)) {
    return parseRailmapYamlArrayRoot(data, fallbacks);
  }

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return {
      ok: false,
      message:
        '根节点必须是对象（含 version、lineId、color、njMetroSettings、stations；version 2 另含 lineIdTextColor；version 3/4 另含 schema、根级 textColor（与换乘 textColor 对称）、direction 与 currentStnId；version 4 的 stations 可含 branches 块，njMetroSettings 可含 branchHeight）或旧版站点数组。',
    };
  }

  const root = data as Record<string, unknown>;

  if (!('stations' in root)) {
    return { ok: false, message: '缺少 stations 字段。' };
  }

  const docVersion = parseYamlDocumentVersion(root.version);
  if (docVersion === null) {
    return { ok: false, message: '不支持的 version：仅支持 1、2、3 或 4。' };
  }

  const rawStations = root.stations;
  if (!Array.isArray(rawStations)) {
    return { ok: false, message: 'stations 必须是数组。' };
  }

  const stationsResult = parseStationsYamlArray(rawStations, '', docVersion);
  if (!stationsResult.ok) {
    return stationsResult;
  }
  const stations = stationsResult.stations;

  const lineIdScalar = toScalarString(root.lineId);
  const lineIdRaw = lineIdScalar !== null ? lineIdScalar.trim() : '';
  const lineId = lineIdRaw !== '' ? lineIdRaw : fallbacks.lineId;

  const color = resolveRootColor(root, fallbacks);

  const lineIdTextColorResult = resolveLineIdTextColor(root, docVersion);
  if (typeof lineIdTextColorResult !== 'string') {
    return lineIdTextColorResult;
  }
  const lineIdTextColor = lineIdTextColorResult;

  if (docVersion >= 3) {
    return parseRailmapYamlV3OrV4(root, fallbacks, lineId, color, lineIdTextColor, stations);
  }

  const njMerged = mergeNjMetroSettings(root.njMetroSettings, fallbacks);
  const currentStnId = resolveCurrentStnId(njMerged.currentStnId, stations, fallbacks.currentStnId);

  let payload: RailmapYamlImport = {
    lineId,
    color,
    lineIdTextColor,
    njMetroSettings: { ...njMerged, currentStnId },
    stations,
  };

  if (docVersion === 1) {
    payload = migrateRailmapYamlV1ToV2(payload);
  }

  return {
    ok: true,
    data: payload,
  };
};
