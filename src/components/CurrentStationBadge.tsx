import type { CSSProperties } from 'react';
import { getCurrentStationBadgeEnCondense, getCurrentStationBadgeZhCondense } from '../badgeTextCondense';
import type { GeneratorState } from '../features/generatorSlice';
import { sansLatinFontStack, sansZhFontStack } from '../fontStacks';

type CurrentStationBadgeProps = {
  data: GeneratorState;
};

const width = 3322;
const height = 800;

const zhTextStyle = (letterSpacing?: number): CSSProperties => ({
  fontFamily: sansZhFontStack,
  fill: '#000000',
  letterSpacing: letterSpacing !== undefined ? `${letterSpacing}px` : undefined,
});

const enTextStyle = (letterSpacing?: number): CSSProperties => ({
  fontFamily: sansLatinFontStack,
  fill: '#000000',
  letterSpacing: letterSpacing !== undefined ? `${letterSpacing}px` : undefined,
});

export function CurrentStationBadge({ data }: CurrentStationBadgeProps) {
  const { stnList, currentStnId, idColor } = data;
  const currentStation = stnList.find((station) => station.id === currentStnId) ?? stnList[0] ?? null;
  const safeStation = currentStation ?? {
    chName: '不存在或未定义',
    enName: 'Bucunzai Huo Weidingyi',
  };
  const zhCondense = getCurrentStationBadgeZhCondense(safeStation.chName, 13);
  const enCondense = getCurrentStationBadgeEnCondense(safeStation.enName, 3);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="badge-svg" role="img" aria-label="当前站贴纸">
      <rect x="0" y="0" width={width} height={height} fill="#ffffff" />
      <rect x="0" y="642.5" width={width} height="157.5" fill={idColor} />

      <g transform={`translate(${width / 2} 336)`}>
        <text
          x="0"
          y="0"
          textAnchor="middle"
          fontSize="246px"
          style={zhTextStyle(zhCondense.letterSpacing)}
          transform={zhCondense.transform}
        >
          {safeStation.chName}
        </text>
      </g>
      <g transform={`translate(${width / 2} 508.5)`}>
        <text
          x="0"
          y="0"
          textAnchor="middle"
          fontSize="117px"
          style={enTextStyle(enCondense.letterSpacing)}
          transform={enCondense.transform}
        >
          {safeStation.enName.toUpperCase()}
        </text>
      </g>
    </svg>
  );
}
