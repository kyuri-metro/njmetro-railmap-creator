import type { CSSProperties, ReactElement } from 'react';
import { getDirectionStationCondenseFromTier } from '../badgeTextCondense';
import { resolveDirectionCondense } from '../directionBadgeCondense';
import {
  directionBadgeAnchors,
  directionBadgeArrow,
  directionBadgeCanvas,
  directionBadgeChrome,
  directionBadgeGaps,
  directionBadgeLabelText,
  directionBadgeLineBadge,
  directionBadgeMargins,
  directionBadgeStationNameDefaultLetterSpacing,
  directionBadgeStationNameTextLayout,
  directionBadgeTerminusLayout,
  type DirectionBadgeStackedTextLayout,
} from '../directionBadgeLayout';
import type { GeneratorState } from '../features/generatorSlice';
import { sansLatinFontStack, sansZhFontStack } from '../fontStacks';
import { getLineIdBadgeWidth } from '../lineIdBadgeMetrics';
import { LineIdBadge } from './LineIdBadge';
import { LineIdBlockAttributionOverlay } from './LineIdBlockAttributionOverlay';
import { useSvgPositioner } from './svgPositioning';

type DirectionBadgeProps = {
  data: GeneratorState;
};

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
  const translateX = direction === 'l' ? 0 : directionBadgeArrow.width;
  const translateY = direction === 'l' ? 0 : directionBadgeArrow.rightwardTranslateY;

  return (
    <g transform={`translate(${translateX} ${translateY}) rotate(${rotation})`}>
      <path d={directionBadgeArrow.path} fill="#000000" />
    </g>
  );
};

const ToLabelBlock = () => {
  const { zh, en } = directionBadgeLabelText.to;

  return (
    <g>
      <text fontSize={`${zh.fontSize}px`} x={zh.x} y={zh.y} style={zhTextStyle(zh.letterSpacing)}>
        往
      </text>
      <text fontSize={`${en.fontSize}px`} x={en.x} y={en.y} style={enTextStyle(en.letterSpacing)}>
        To
      </text>
    </g>
  );
};

const StationNameBlock = ({
  enName,
  stationName,
  zhTier,
  enTier,
  defaultZhLetterSpacing,
  defaultEnLetterSpacing,
  layout,
}: {
  enName: string;
  stationName: string;
  zhTier: number;
  enTier: number;
  defaultZhLetterSpacing: number;
  defaultEnLetterSpacing: number;
  layout: DirectionBadgeStackedTextLayout;
}) => {
  const zhCondense = getDirectionStationCondenseFromTier(defaultZhLetterSpacing, 'zh', zhTier);
  const enCondense = getDirectionStationCondenseFromTier(defaultEnLetterSpacing, 'en', enTier);

  const zhText = (
    <text
      fontSize={layout.zhFontSize}
      x="0"
      y={layout.zhBaselineY}
      style={zhTextStyle(zhCondense.letterSpacing)}
    >
      {stationName}
    </text>
  );

  const enText = (
    <text
      fontSize={layout.enFontSize}
      x="0"
      y={layout.enBaselineY}
      style={enTextStyle(enCondense.letterSpacing)}
    >
      {enName.toUpperCase()}
    </text>
  );

  return (
    <g>
      {zhCondense.transform ? <g transform={zhCondense.transform}>{zhText}</g> : zhText}
      {enCondense.transform ? <g transform={enCondense.transform}>{enText}</g> : enText}
    </g>
  );
};

const LineNameBlock = ({ lineId }: { lineId: string }) => {
  const layout = directionBadgeStationNameTextLayout.to;
  const { zh, en } = directionBadgeLabelText.lineName;

  return (
    <g>
      <text fontSize={layout.zhFontSize} x="0" y={layout.zhBaselineY} style={zhTextStyle(zh.letterSpacing)}>
        号线
      </text>
      <text fontSize={layout.enFontSize} x="0" y={layout.enBaselineY} style={enTextStyle(en.letterSpacing)}>
        {`Line ${lineId}`}
      </text>
    </g>
  );
};

const TerminusLabelBlock = () => {
  const layout = directionBadgeStationNameTextLayout.to;
  const { zh, en } = directionBadgeLabelText.terminus;

  return (
    <g>
      <text
        fontSize={layout.zhFontSize}
        x="0"
        y={layout.zhBaselineY}
        textAnchor="middle"
        style={zhTextStyle(zh.letterSpacing)}
      >
        终点站
      </text>
      <text
        fontSize={layout.enFontSize}
        x="0"
        y={layout.enBaselineY}
        textAnchor="middle"
        style={enTextStyle(en.letterSpacing)}
      >
        Terminus
      </text>
    </g>
  );
};

const NextLabelBlock = () => {
  const { zh, en } = directionBadgeLabelText.next;

  return (
    <g>
      <text fontSize={`${zh.fontSize}px`} x={zh.x} y={zh.y} style={zhTextStyle(zh.letterSpacing)}>
        下一站
      </text>
      <text fontSize={`${en.fontSize}px`} x={en.x} y={en.y} style={enTextStyle(en.letterSpacing)}>
        Next Station
      </text>
    </g>
  );
};

const NextStationNameBlock = ({
  enName,
  stationName,
  zhTier,
  enTier,
}: {
  enName: string;
  stationName: string;
  zhTier: number;
  enTier: number;
}) => (
  <StationNameBlock
    enName={enName}
    stationName={stationName}
    zhTier={zhTier}
    enTier={enTier}
    defaultZhLetterSpacing={directionBadgeStationNameDefaultLetterSpacing.nextZh}
    defaultEnLetterSpacing={directionBadgeStationNameDefaultLetterSpacing.nextEn}
    layout={directionBadgeStationNameTextLayout.next}
  />
);

export function DirectionBadge({ data }: DirectionBadgeProps) {
  const { stnList, currentStnId, direction, idColor, idTextColor, lineId } = data;
  const { anchor, resolvedBoxes } = useSvgPositioner(directionBadgeCanvas.width, directionBadgeCanvas.height);

  const lineBadgeBox = resolvedBoxes['line-badge'];
  const lineIdBadgeSupported = getLineIdBadgeWidth(lineId, directionBadgeLineBadge.height) !== null;
  const showLineIdAttribution =
    lineIdBadgeSupported && lineBadgeBox !== undefined && lineBadgeBox.width > 0.5;

  const wrapPreview = (svg: ReactElement) => (
    <div className="direction-badge-preview-wrap">
      {svg}
      {showLineIdAttribution ? (
        <LineIdBlockAttributionOverlay
          viewWidth={directionBadgeCanvas.width}
          viewHeight={directionBadgeCanvas.height}
          box={lineBadgeBox}
        />
      ) : null}
    </div>
  );

  const isRightward = direction === 'r';

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
      <svg
        viewBox={`0 0 ${directionBadgeCanvas.width} ${directionBadgeCanvas.height}`}
        className="badge-svg"
        role="img"
        aria-label="终点站方向牌"
      >
        <rect id="white-background" x="0" y="0" width={directionBadgeCanvas.width} height={directionBadgeCanvas.height} fill="white" />
        <rect
          id="button-line"
          x="0"
          y={directionBadgeCanvas.height - directionBadgeChrome.buttonLineHeight}
          width={directionBadgeCanvas.width}
          height={directionBadgeChrome.buttonLineHeight}
          fill={idColor}
        />

        {anchor('line-badge', <LineIdBadge lineId={lineId} color={idColor} textColor={idTextColor} height={directionBadgeLineBadge.height} />, {
          left: directionBadgeTerminusLayout.lineBadgeLeft,
          top: directionBadgeLineBadge.top,
        })}

        {anchor('line-name', <LineNameBlock lineId={lineId} />, {
          left: { to: 'line-badge', edge: 'right', gap: directionBadgeGaps.lineBadge },
          top: directionBadgeTerminusLayout.lineNameTop,
        })}

        {anchor('terminus-label', <TerminusLabelBlock />, {
          right: { edge: 'right', gap: directionBadgeTerminusLayout.terminusLabelRightGap },
          top: directionBadgeTerminusLayout.terminusLabelTop,
        })}
      </svg>,
    );
  }

  const condenseTiers = resolveDirectionCondense({
    direction,
    lineId,
    toStation: safeToStation,
    nextStation: safeNextStation,
  }).tiers;

  return wrapPreview(
    <svg
      viewBox={`0 0 ${directionBadgeCanvas.width} ${directionBadgeCanvas.height}`}
      className="badge-svg"
      role="img"
      aria-label="方向牌"
    >
      <rect id="white-background" x="0" y="0" width={directionBadgeCanvas.width} height={directionBadgeCanvas.height} fill="white" />
      <rect
        id="button-line"
        x="0"
        y={directionBadgeCanvas.height - directionBadgeChrome.buttonLineHeight}
        width={directionBadgeCanvas.width}
        height={directionBadgeChrome.buttonLineHeight}
        fill={idColor}
      />

      {isRightward
        ? anchor('next-label', <NextLabelBlock />, {
            left: directionBadgeMargins.left,
            top: directionBadgeAnchors.nextLabelTop,
          })
        : anchor('arrow', <Arrow direction={direction} />, {
            left: directionBadgeMargins.left,
            top: directionBadgeAnchors.arrowTop,
          })}

      {isRightward
        ? anchor(
            'next-station-name',
            <NextStationNameBlock
              enName={safeNextStation.enName}
              stationName={safeNextStation.chName}
              zhTier={condenseTiers.nextZh}
              enTier={condenseTiers.nextEn}
            />,
            {
              left: { to: 'next-label', edge: 'right', gap: directionBadgeGaps.nextSection },
              top: directionBadgeAnchors.nextStationTop,
            },
          )
        : anchor('line-badge', <LineIdBadge lineId={lineId} color={idColor} textColor={idTextColor} height={directionBadgeLineBadge.height} />, {
            left: { to: 'arrow', edge: 'right', gap: directionBadgeGaps.arrow },
            top: directionBadgeLineBadge.top,
          })}

      {isRightward
        ? anchor('line-badge', <LineIdBadge lineId={lineId} color={idColor} textColor={idTextColor} height={directionBadgeLineBadge.height} />, {
            right: { to: 'to-label', edge: 'left', gap: directionBadgeGaps.lineBadge },
            top: directionBadgeLineBadge.top,
          })
        : anchor('to-label', <ToLabelBlock />, {
            left: { to: 'line-badge', edge: 'right', gap: directionBadgeGaps.lineBadge },
            top: directionBadgeAnchors.toLabelTop,
          })}

      {anchor(
        'to-station-name',
        <StationNameBlock
          enName={safeToStation.enName}
          stationName={safeToStation.chName}
          zhTier={condenseTiers.toZh}
          enTier={condenseTiers.toEn}
          defaultZhLetterSpacing={directionBadgeStationNameDefaultLetterSpacing.toZh}
          defaultEnLetterSpacing={directionBadgeStationNameDefaultLetterSpacing.toEn}
          layout={directionBadgeStationNameTextLayout.to}
        />,
        isRightward
          ? {
              right: { to: 'arrow', edge: 'left', gap: directionBadgeGaps.arrow },
              top: directionBadgeAnchors.toStationTop,
            }
          : {
              left: { to: 'to-label', edge: 'right', gap: directionBadgeGaps.stationLabel },
              top: directionBadgeAnchors.toStationTop,
            },
      )}

      {isRightward
        ? anchor('to-label', <ToLabelBlock />, {
            right: { to: 'to-station-name', edge: 'left', gap: directionBadgeGaps.stationLabel },
            top: directionBadgeAnchors.toLabelTop,
          })
        : anchor('next-label', <NextLabelBlock />, {
            right: { to: 'next-station-name', edge: 'left', gap: directionBadgeGaps.nextSection },
            top: directionBadgeAnchors.nextLabelTop,
          })}

      {isRightward
        ? anchor('arrow', <Arrow direction={direction} />, { right: directionBadgeMargins.right, top: directionBadgeAnchors.arrowTop })
        : anchor(
            'next-station-name',
            <NextStationNameBlock
              enName={safeNextStation.enName}
              stationName={safeNextStation.chName}
              zhTier={condenseTiers.nextZh}
              enTier={condenseTiers.nextEn}
            />,
            {
              right: directionBadgeMargins.right,
              top: directionBadgeAnchors.nextStationTop,
            },
          )}
    </svg>,
  );
}
