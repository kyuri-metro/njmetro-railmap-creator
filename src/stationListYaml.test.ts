import { describe, expect, it } from 'vitest';
import {
  getDefaultGeneratorState,
  getEmptyGeneratorState,
  type GeneratorState,
} from './features/generatorSlice';
import {
  DEFAULT_BRANCH_HEIGHT,
  migrateRailmapYamlV1ToV2,
  parseRailmapYaml,
  serializeRailmapYaml,
  type RailmapYamlImport,
} from './stationListYaml';
import { isBranchGroup } from './stationListTopology';

const fallback = (): GeneratorState => getEmptyGeneratorState();

describe('migrateRailmapYamlV1ToV2', () => {
  it('forces lineIdTextColor and transfer textColor to white', () => {
    const input: RailmapYamlImport = {
      lineId: '3',
      color: '#009a44',
      lineIdTextColor: '#abcdef',
      njMetroSettings: {
        totalLength: 100,
        direction: 'l',
        currentStnId: 'a',
        showStationTypeIcons: false,
        useCapsuleTransferMarkers: false,
        trainType: 'a',
        branchHeight: DEFAULT_BRANCH_HEIGHT,
      },
      stations: [
        {
          id: 'a',
          chName: '甲',
          enName: 'A',
          type: 'none',
          transfer: [{ id: '1', color: '#00a9e0', textColor: '#123456' }],
        },
      ],
    };

    const migrated = migrateRailmapYamlV1ToV2(input);
    expect(migrated.lineIdTextColor).toBe('#ffffff');
    expect(migrated.stations[0].transfer[0].textColor).toBe('#ffffff');
  });
});

describe('parseRailmapYaml / serializeRailmapYaml', () => {
  it('round-trips a minimal version 4 document', () => {
    const state = getDefaultGeneratorState();
    state.stnList = state.stnList.slice(0, 2);
    state.currentStnId = state.stnList[0].id;
    state.trainType = 'b-long';

    const yaml = serializeRailmapYaml(state);
    expect(yaml).toContain('schema: https://umamichi.moe/2026/kyuri-naive');
    expect(yaml).toContain('version: 4');
    expect(yaml).toContain('trainType: b-long');
    expect(yaml).toContain(`branchHeight: ${DEFAULT_BRANCH_HEIGHT}`);

    const parsed = parseRailmapYaml(yaml, fallback());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.data.lineId).toBe(state.lineId);
    expect(parsed.data.color).toBe(state.idColor.toLowerCase());
    expect(parsed.data.lineIdTextColor).toBe(state.idTextColor.toLowerCase());
    expect(parsed.data.stations).toHaveLength(2);
    expect(parsed.data.njMetroSettings.currentStnId).toBe(state.currentStnId);
    expect(parsed.data.njMetroSettings.trainType).toBe('b-long');
    expect(parsed.data.njMetroSettings.useCapsuleTransferMarkers).toBe(false);
    expect(parsed.data.njMetroSettings.branchHeight).toBe(DEFAULT_BRANCH_HEIGHT);
  });

  it('parses version 4 opening branches and rejects illegal topology', () => {
    const yaml = `
version: 4
schema: https://umamichi.moe/2026/kyuri-naive
direction: r
currentStnId: b
lineId: "3"
color: "#009a44"
textColor: "#ffffff"
njMetroSettings:
  totalLength: 1000
  branchHeight: 80
stations:
  - branches:
      - - id: a
          name: { zh: 甲, en: A }
          type: none
          transfer: []
      - - id: b
          name: { zh: 乙, en: B }
          type: none
          transfer: []
    main: 1
  - id: c
    name: { zh: 丙, en: C }
    type: none
    transfer: []
`;

    const parsed = parseRailmapYaml(yaml, fallback());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.data.njMetroSettings.branchHeight).toBe(80);
    expect(isBranchGroup(parsed.data.stations[0])).toBe(true);
    if (isBranchGroup(parsed.data.stations[0])) {
      expect(parsed.data.stations[0].main).toBe(1);
      expect(parsed.data.stations[0].branches[0][0].id).toBe('a');
    }

    const illegal = `
version: 4
schema: https://umamichi.moe/2026/kyuri-naive
direction: l
currentStnId: a
lineId: "3"
color: "#009a44"
textColor: "#ffffff"
njMetroSettings:
  totalLength: 100
stations:
  - id: a
    name: { zh: 甲, en: A }
    type: none
    transfer: []
  - branches:
      - - id: b
          name: { zh: 乙, en: B }
          type: none
          transfer: []
    main: 0
  - id: c
    name: { zh: 丙, en: C }
    type: none
    transfer: []
`;
    expect(parseRailmapYaml(illegal, fallback()).ok).toBe(false);
  });

  it('still imports legacy version 3 documents', () => {
    const yaml = `
version: 3
schema: https://umamichi.moe/2026/kyuri-naive
direction: l
currentStnId: foo
lineId: "3"
color: "#009a44"
textColor: "#ffffff"
njMetroSettings:
  totalLength: 100
stations:
  - id: foo
    name:
      - zh: 甲
      - en: Foo
    type: none
    transfer: []
`;
    const parsed = parseRailmapYaml(yaml, fallback());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.data.njMetroSettings.branchHeight).toBe(DEFAULT_BRANCH_HEIGHT);
    expect(parsed.data.stations[0]).toMatchObject({ id: 'foo' });
  });

  it('round-trips useCapsuleTransferMarkers when enabled', () => {
    const state = getDefaultGeneratorState();
    state.stnList = state.stnList.slice(0, 2);
    state.currentStnId = state.stnList[0].id;
    state.useCapsuleTransferMarkers = true;

    const yaml = serializeRailmapYaml(state);
    expect(yaml).toContain('useCapsuleTransferMarkers: true');

    const parsed = parseRailmapYaml(yaml, fallback());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.data.njMetroSettings.useCapsuleTransferMarkers).toBe(true);
  });

  it('defaults omitted appearance options to legacy look when YAML omits them', () => {
    const yaml = `
version: 3
schema: https://umamichi.moe/2026/kyuri-naive
direction: l
currentStnId: foo
lineId: "3"
color: "#009a44"
textColor: "#ffffff"
njMetroSettings:
  totalLength: 100
stations:
  - id: foo
    name:
      - zh: 甲
      - en: Foo
    type: none
    transfer: []
`;

    const previous = fallback();
    previous.showStationTypeIcons = true;
    previous.useCapsuleTransferMarkers = true;
    previous.trainType = 'suburban-d';
    const parsed = parseRailmapYaml(yaml, previous);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.data.njMetroSettings.showStationTypeIcons).toBe(false);
    expect(parsed.data.njMetroSettings.useCapsuleTransferMarkers).toBe(false);
    expect(parsed.data.njMetroSettings.trainType).toBe('a');
  });

  it('accepts legacy http schema alias on import', () => {
    const yaml = `
version: 3
schema: http://umamichi.moe/2026/kyuri-naive
direction: l
currentStnId: foo
lineId: "3"
color: "#009a44"
textColor: "#ffffff"
njMetroSettings:
  totalLength: 100
  showStationTypeIcons: false
stations:
  - id: foo
    name:
      - zh: 甲
      - en: Foo
    type: none
    transfer: []
`;

    const parsed = parseRailmapYaml(yaml, fallback());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.data.stations[0].id).toBe('foo');
  });

  it('rejects unsupported schema strings', () => {
    const yaml = `
version: 3
schema: https://example.com/other
direction: l
currentStnId: foo
lineId: "3"
color: "#009a44"
textColor: "#ffffff"
njMetroSettings:
  totalLength: 100
stations:
  - id: foo
    name: { zh: 甲, en: Foo }
    type: none
    transfer: []
`;

    const parsed = parseRailmapYaml(yaml, fallback());
    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }
    expect(parsed.message).toMatch(/schema/);
  });

  it('migrates bare station arrays as version 1', () => {
    const yaml = `
- id: alpha
  name:
    - zh: 甲站
    - en: Alpha
  type: railway
  transfer:
    - lineId: "1"
      color: "#00A9E0"
`;

    const parsed = parseRailmapYaml(yaml, fallback());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.data.lineIdTextColor).toBe('#ffffff');
    expect(parsed.data.stations[0].type).toBe('railway');
    expect(parsed.data.stations[0].transfer[0]).toEqual({
      id: '1',
      color: '#00a9e0',
      textColor: '#ffffff',
    });
  });

  it('requires transfer textColor on version 2', () => {
    const yaml = `
version: 2
lineId: "3"
color: "#009a44"
lineIdTextColor: "#ffffff"
njMetroSettings:
  totalLength: 50
  direction: r
  currentStnId: s1
  showStationTypeIcons: true
stations:
  - id: s1
    name: { zh: 甲, en: A }
    type: none
    transfer:
      - lineId: "2"
        color: "#c4003a"
`;

    const parsed = parseRailmapYaml(yaml, fallback());
    expect(parsed.ok).toBe(false);
  });

  it('parses a valid version 2 document', () => {
    const yaml = `
version: 2
lineId: "3"
color: "#009a44"
lineIdTextColor: "#eeeeee"
njMetroSettings:
  totalLength: 50
  direction: r
  currentStnId: s1
  showStationTypeIcons: true
stations:
  - id: s1
    name: { zh: 甲, en: A }
    type: none
    transfer:
      - lineId: "2"
        color: "#c4003a"
        textColor: "#ffffff"
  - id: s2
    name: { zh: 乙, en: B }
    type: airport
    transfer: []
`;

    const parsed = parseRailmapYaml(yaml, fallback());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.data.lineIdTextColor).toBe('#eeeeee');
    expect(parsed.data.njMetroSettings.direction).toBe('r');
    expect(parsed.data.njMetroSettings.showStationTypeIcons).toBe(true);
    expect(parsed.data.stations[1].type).toBe('airport');
  });
});
