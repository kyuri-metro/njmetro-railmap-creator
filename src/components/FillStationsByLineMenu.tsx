import { FloatingMenu, type FloatingMenuEntry } from '@umamichi-ui/common-components/menu';
import { builtinOpenedLineIds } from '../builtinOpenedLineStations';
import { builtinJianbanLineIds } from '../builtinJianbanLineStations';

export type BuiltinStationNetwork = 'opened' | 'jianban';

type FillStationsByLineMenuProps = {
  onSelectLine: (network: BuiltinStationNetwork, lineId: string) => void;
};

const sectionHeading = (label: string) => <span className="dropdown-menu-section-heading">{label}</span>;

const buildLineItems = (
  network: BuiltinStationNetwork,
  lineIds: readonly string[],
  onSelectLine: FillStationsByLineMenuProps['onSelectLine'],
): FloatingMenuEntry[] =>
  lineIds.map((lineId) => ({
    kind: 'item' as const,
    id: `${network}-${lineId}`,
    label: lineId,
    onSelect: () => onSelectLine(network, lineId),
  }));

export function FillStationsByLineMenu({ onSelectLine }: FillStationsByLineMenuProps) {
  const items: FloatingMenuEntry[] = [
    {
      kind: 'item',
      id: 'hdr-opened',
      label: sectionHeading('南京地铁现有线网（截止 2026.6）'),
      disabled: true,
      onSelect: () => {},
    },
    ...buildLineItems('opened', builtinOpenedLineIds, onSelectLine),
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
