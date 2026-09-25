import { FloatingMenu, type FloatingMenuEntry } from '@umamichi-ui/common-components/menu';
import { builtinOpenedLineIds } from '../builtinOpenedLineStations';
import { builtinJianbanLineIds } from '../builtinJianbanLineStations';
import {
  builtinOpenedYamlPresets,
  resolveOpenedYamlPresetSwatch,
  type BuiltinOpenedYamlPreset,
} from '../builtinOpenedYamlPresets';
import { resolveJianbanLineBackgroundColor } from '../jianbanLineColors';
import { getNjmetroLineBackgroundColor } from '../njmetroLinePalette';

export type BuiltinStationNetwork = 'opened' | 'jianban';

type FillStationsByLineMenuProps = Readonly<{
  onSelectLine: (network: BuiltinStationNetwork, lineId: string) => void;
}>;

const FALLBACK_LINE_SWATCH = '#8c989f';

const resolveLineSwatch = (network: BuiltinStationNetwork, lineId: string) => {
  const color =
    network === 'jianban'
      ? resolveJianbanLineBackgroundColor(lineId)
      : getNjmetroLineBackgroundColor(lineId);
  return color ?? FALLBACK_LINE_SWATCH;
};

const sectionHeading = (label: string) => <span className="dropdown-menu-section-heading">{label}</span>;

const lineMenuLabel = (swatch: string, text: string) => (
  <span className="fill-line-menu-item">
    <span className="fill-line-menu-item__swatch" style={{ background: swatch }} aria-hidden="true" />
    <span>{text}</span>
  </span>
);

const buildLineItems = (
  network: BuiltinStationNetwork,
  lineIds: readonly string[],
  onSelectLine: FillStationsByLineMenuProps['onSelectLine'],
): FloatingMenuEntry[] =>
  lineIds.map((lineId) => ({
    kind: 'item' as const,
    id: `${network}-${lineId}`,
    label: lineMenuLabel(resolveLineSwatch(network, lineId), lineId),
    onSelect: () => onSelectLine(network, lineId),
  }));

const buildOpenedYamlPresetItems = (
  presets: readonly BuiltinOpenedYamlPreset[],
  onSelectLine: FillStationsByLineMenuProps['onSelectLine'],
): FloatingMenuEntry[] =>
  presets.map((preset) => ({
    kind: 'item' as const,
    id: `opened-yaml-${preset.id}`,
    label: lineMenuLabel(resolveOpenedYamlPresetSwatch(preset), preset.label),
    onSelect: () => onSelectLine('opened', preset.id),
  }));

export function FillStationsByLineMenu({ onSelectLine }: FillStationsByLineMenuProps) {
  const items: FloatingMenuEntry[] = [
    {
      kind: 'item',
      id: 'hdr-opened',
      label: sectionHeading('南京地铁现有线网（截止 2026.10）'),
      disabled: true,
      onSelect: () => {},
    },
    ...buildLineItems('opened', builtinOpenedLineIds, onSelectLine),
    ...buildOpenedYamlPresetItems(builtinOpenedYamlPresets, onSelectLine),
    { kind: 'separator', id: 'sep-networks' },
    {
      kind: 'item',
      id: 'hdr-jianban',
      label: sectionHeading('简办动态演示线网（BV1Bw41127DF）'),
      disabled: true,
      title: '站点设置和线路走向等有不确定性；请以官方最终公布为准。详见关于 / docs',
      onSelect: () => {},
    },
    ...buildLineItems('jianban', builtinJianbanLineIds, onSelectLine),
  ];

  return (
    <FloatingMenu
      menuAriaLabel="按线路填充站点"
      scrollRootSelector=".app-main"
      triggerClassName="primary-button dropdown-menu-trigger"
      triggerLabel="按线路填充站点"
      items={items}
    />
  );
}
