import { getNjmetroLineBackgroundColor } from './njmetroLinePalette';
import sixS1ExpressYaml from '../docs/6-s1 express/6-s1.yml?raw';

export type BuiltinOpenedYamlPreset = Readonly<{
  id: string;
  label: string;
  /** 菜单色块所用线路号（走南京地铁色板） */
  swatchLineId: string;
  yaml: string;
}>;

export const builtinOpenedYamlPresets: readonly BuiltinOpenedYamlPreset[] = [
  {
    id: '6-S1',
    label: '6-S1直通',
    swatchLineId: '6',
    yaml: sixS1ExpressYaml,
  },
];

export const getBuiltinOpenedYamlPreset = (id: string): BuiltinOpenedYamlPreset | null =>
  builtinOpenedYamlPresets.find((preset) => preset.id === id) ?? null;

export const resolveOpenedYamlPresetSwatch = (preset: BuiltinOpenedYamlPreset): string =>
  getNjmetroLineBackgroundColor(preset.swatchLineId) ?? '#8c989f';
