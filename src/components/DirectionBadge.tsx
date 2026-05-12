import type { CSSProperties, ReactElement } from 'react';
import type { GeneratorState } from '../features/generatorSlice';
import { sansLatinFontStack, sansZhFontStack } from '../fontStacks';
import { getLineIdBadgeWidth, LineIdBadge } from './LineIdBadge';
import { LineIdBlockAttributionOverlay } from './LineIdBlockAttributionOverlay';
import { useSvgPositioner } from './svgPositioning';

type DirectionBadgeProps = {
  data: GeneratorState;
};

const width = 3972;
const height = 800;
const stackedTextLayout1 = {
  zhFontSize: '195.5px',
  zhBaselineY: 103,
  enFontSize: '82.5px',
  enBaselineY: 238.5,
};
const stackedTextLayout2 = {
  zhFontSize: '195.5px',
  zhBaselineY: 104.5,
  enFontSize: '82.5px',
  enBaselineY: 240,
};
const lineBadgeHeight = 297.5;
const lineBadgeGap = 82;

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

const Arrow = ({ direction }: { direction: 'l' | 'r' }) => {
  const rotation = direction === 'l' ? 0 : 180;
  const translateX = direction === 'l' ? 0 : 340;
  const translateY = direction === 'l' ? 0 : 294.5;

  return (
    <g transform={`translate(${translateX} ${translateY}) rotate(${rotation})`}>
      <path d="m 145.5,0 h 71 L 99.5,119 H 340 v 55 H 100 l 120.5,120.5 h -74 L 0,148 Z" fill="#000000" />
    </g>
  );
};

const ToLabelBlock = () => (
  <g>
    <text fontSize="115.5px" x="0" y="155.5" style={zhTextStyle(6)}>
      往
    </text>
    <text fontSize="55.5px" x="10" y="238.5" style={enTextStyle(3.5)}>
      To
    </text>
  </g>
);

const StationNameBlock = ({ enName, stationName }: { enName: string; stationName: string }) => {
  return (
    <g>
      <text fontSize={stackedTextLayout1.zhFontSize} x="0" y={stackedTextLayout1.zhBaselineY} style={zhTextStyle(11)}>
        {stationName}
      </text>
      <text fontSize={stackedTextLayout1.enFontSize} x="0" y={stackedTextLayout1.enBaselineY} style={enTextStyle(2)}>
        {enName.toUpperCase()}
      </text>
    </g>
  );
};

const LineNameBlock = ({ lineId }: { lineId: string }) => (
  <g>
    <text fontSize={stackedTextLayout1.zhFontSize} x="0" y={stackedTextLayout1.zhBaselineY} style={zhTextStyle(11)}>
      号线
    </text>
    <text fontSize={stackedTextLayout1.enFontSize} x="0" y={stackedTextLayout1.enBaselineY} style={enTextStyle(2)}>
      {`Line ${lineId}`}
    </text>
  </g>
);

const TerminusLabelBlock = () => (
  <g>
    <text fontSize={stackedTextLayout1.zhFontSize} x="0" y={stackedTextLayout1.zhBaselineY} textAnchor="middle" style={zhTextStyle(10.5)}>
      终点站
    </text>
    <text fontSize={stackedTextLayout1.enFontSize} x="0" y={stackedTextLayout1.enBaselineY} textAnchor="middle" style={enTextStyle(0.5)}>
      Terminus
    </text>
  </g>
);

const NextLabelBlock = () => (
  <g>
    <text fontSize="115.5px" x="0" y="157.5" style={zhTextStyle(8)}>
      下一站
    </text>
    <text fontSize="55.5px" x="11.5" y="241" style={enTextStyle(3.5)}>
      Next Station
    </text>
  </g>
);

const NextStationNameBlock = ({ enName, stationName }: { enName: string; stationName: string }) => {
  return (
    <g>
      <text fontSize={stackedTextLayout2.zhFontSize} x="0" y={stackedTextLayout2.zhBaselineY} style={zhTextStyle(10.5)}>
        {stationName}
      </text>
      <text fontSize={stackedTextLayout2.enFontSize} x="0" y={stackedTextLayout2.enBaselineY} style={enTextStyle(0.5)}>
        {enName.toUpperCase()}
      </text>
    </g>
  );
};

export function DirectionBadge({ data }: DirectionBadgeProps) {
  const { stnList, currentStnId, direction, idColor, idTextColor, lineId } = data;
  const { anchor, resolvedBoxes } = useSvgPositioner(width, height);

  const lineBadgeBox = resolvedBoxes['line-badge'];
  const lineIdBadgeSupported = getLineIdBadgeWidth(lineId, lineBadgeHeight) !== null;
  const showLineIdAttribution =
    lineIdBadgeSupported && lineBadgeBox !== undefined && lineBadgeBox.width > 0.5;

  const wrapPreview = (svg: ReactElement) => (
    <div className="direction-badge-preview-wrap">
      {svg}
      {showLineIdAttribution ? (
        <LineIdBlockAttributionOverlay viewWidth={width} viewHeight={height} box={lineBadgeBox} />
      ) : null}
    </div>
  );

  const isRightward = direction === 'r';
  const leftMargin = 171;
  const rightMargin = 167.5;
  const arrowGap = 81;
  const stationLabelGap = 92;
  const nextSectionGap = 109;

  const currentIndex = stnList.findIndex((station) => station.id === currentStnId);
  const nextIndex = currentIndex === -1 ? -1 : direction === 'r' ? currentIndex + 1 : currentIndex - 1;
  const nextStation = stnList[nextIndex] ?? stnList[currentIndex] ?? null;
  const toStation = direction === 'r' ? stnList[stnList.length - 1] : stnList[0];
  const isTerminus =
    currentIndex !== -1 && ((direction === 'r' && currentIndex === stnList.length - 1) || (direction === 'l' && currentIndex === 0));
  const safeToStation = toStation ?? { chName: '不存在或未定义', enName: 'Bucunzai Huo Weidingyi' };
  const safeNextStation = nextStation ?? { chName: '不存在或未定义', enName: 'Bucunzai Huo Weidingyi' };

  if (isTerminus) {
    return wrapPreview(
      <svg viewBox={`0 0 ${width} ${height}`} className="badge-svg" role="img" aria-label="终点站方向牌">
        <rect id="white-background" x="0" y="0" width={width} height={height} fill="white" />
        <rect id="button-line" x="0" y={height - 157.5} width={width} height="157.5" fill={idColor} />

        {anchor('line-badge', <LineIdBadge lineId={lineId} color={idColor} textColor={idTextColor} height={lineBadgeHeight} />, {
          left: 539.5,
          top: 218,
        })}

        {anchor('line-name', <LineNameBlock lineId={lineId} />, {
          left: { to: 'line-badge', edge: 'right', gap: lineBadgeGap },
          top: 176.5,
        })}

        {anchor('terminus-label', <TerminusLabelBlock />, {
          right: { edge: 'right', gap: 538.5 },
          top: 174,
        })}
      </svg>,
    );
  }

  return wrapPreview(
    <svg viewBox={`0 0 ${width} ${height}`} className="badge-svg" role="img" aria-label="方向牌">
      <rect id="white-background" x="0" y="0" width={width} height={height} fill="white" />
      <rect id="button-line" x="0" y={height - 157.5} width={width} height="157.5" fill={idColor} />

      {isRightward
        ? anchor('next-label', <NextLabelBlock />, {
            left: leftMargin,
            top: 313.5,
          })
        : anchor('arrow', <Arrow direction={direction} />, { left: leftMargin, top: 219 })}

      {isRightward
        ? anchor(
            'next-station-name',
            <NextStationNameBlock enName={safeNextStation.enName} stationName={safeNextStation.chName} />,
            {
              left: { to: 'next-label', edge: 'right', gap: nextSectionGap },
              top: 176.5,
            },
          )
        : anchor('line-badge', <LineIdBadge lineId={lineId} color={idColor} textColor={idTextColor} height={lineBadgeHeight} />, {
            left: { to: 'arrow', edge: 'right', gap: arrowGap },
            top: 218,
          })}

      {isRightward
        ? anchor('line-badge', <LineIdBadge lineId={lineId} color={idColor} textColor={idTextColor} height={lineBadgeHeight} />, {
            right: { to: 'to-label', edge: 'left', gap: lineBadgeGap },
            top: 218,
          })
        : anchor('to-label', <ToLabelBlock />, {
            left: { to: 'line-badge', edge: 'right', gap: lineBadgeGap },
            top: 311.5,
          })}

      {anchor(
        'to-station-name',
        <StationNameBlock
          enName={safeToStation.enName}
          stationName={safeToStation.chName}
        />,
        isRightward
          ? {
              right: { to: 'arrow', edge: 'left', gap: arrowGap },
              top: 174,
            }
          : {
              left: { to: 'to-label', edge: 'right', gap: stationLabelGap },
              top: 174,
            },
      )}

      {isRightward
        ? anchor('to-label', <ToLabelBlock />, {
            right: { to: 'to-station-name', edge: 'left', gap: stationLabelGap },
            top: 311.5,
          })
        : anchor('next-label', <NextLabelBlock />, {
            right: { to: 'next-station-name', edge: 'left', gap: nextSectionGap },
            top: 313.5,
          })}

      {isRightward
        ? anchor('arrow', <Arrow direction={direction} />, { right: rightMargin, top: 219 })
        : anchor(
            'next-station-name',
            <NextStationNameBlock enName={safeNextStation.enName} stationName={safeNextStation.chName} />,
            {
              right: rightMargin,
              top: 176.5,
            },
          )}
    </svg>,
  );
}
