import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { getRouteZhNameCondense } from '../badgeTextCondense';
import type { GeneratorState, StationItem, TransferLine } from '../features/generatorSlice';
import { njmetroDingsFontStack, sansLatinFontStack, sansZhFontStack } from '../fontStacks';
import { getLineIdBadgeWidth } from '../lineIdBadgeMetrics';
import {
  routeBadgeCanvas,
  routeBadgeCurrentCard,
  routeBadgeDirectionArrow,
  routeBadgeDirectionArrowScale,
  routeBadgeGaps,
  routeBadgeLayoutOffsetX,
  routeBadgeLine,
  routeBadgeStationRadii,
  routeBadgeTransferIcon,
  routeBadgeTransferLineId,
} from '../routeBadgeLayout';
import { LineIdBadge } from './LineIdBadge';
import { useSvgPositioner } from './svgPositioning';

type RouteBadgeProps = {
  data: GeneratorState;
};

const zhTextStyle = (letterSpacing?: number, fill = '#000000'): CSSProperties => ({
  fontFamily: sansZhFontStack,
  fill,
  letterSpacing: letterSpacing !== undefined ? `${letterSpacing}px` : undefined,
});

const enTextStyle = (letterSpacing?: number, fill = '#000000'): CSSProperties => ({
  fontFamily: sansLatinFontStack,
  fill,
  letterSpacing: letterSpacing ? `${letterSpacing}px` : undefined,
});

const stationTypeIconMap = {
  railway: '\uE000',
  airport: '\uE001',
} as const;

const getStationTypeIcon = (type: StationItem['type']) => {
  if (type === 'none') {
    return null;
  }

  return stationTypeIconMap[type];
};

const width = routeBadgeCanvas.width;
const height = routeBadgeCanvas.height;
const lineCenterY = routeBadgeLine.centerY;
const lineThickness = routeBadgeLine.thickness;
const smallStationRadius = routeBadgeStationRadii.small;
const endStationRadius = routeBadgeStationRadii.endOuter;
const endStationInnerRadius = routeBadgeStationRadii.endInner;
const currentOuterRadius = routeBadgeStationRadii.currentOuter;
const currentInnerRadius = routeBadgeStationRadii.currentInner;
const directionArrowBaseWidth = routeBadgeDirectionArrow.baseWidth;
const directionArrowBaseHeight = routeBadgeDirectionArrow.baseHeight;
const directionArrowWidth = routeBadgeDirectionArrow.width;
const directionArrowGap = routeBadgeDirectionArrow.gap;
const directionArrowScale = routeBadgeDirectionArrowScale;
const routeLayoutOffsetX = routeBadgeLayoutOffsetX;
const topLabelGap = routeBadgeGaps.topLabel;
const bottomLabelGap = routeBadgeGaps.bottomLabel;
const topTransferGap = routeBadgeGaps.topTransfer;
const bottomTransferGap = routeBadgeGaps.bottomTransfer;
const currentCardConnectorHeight = routeBadgeCurrentCard.connectorHeight;
const currentCardGap = routeBadgeCurrentCard.gap;
const currentCardHorizontalPadding = routeBadgeCurrentCard.horizontalPadding;
const currentCardTopPadding = routeBadgeCurrentCard.topPadding;
const currentCardBottomPadding = routeBadgeCurrentCard.bottomPadding;
const transferIconViewBoxX = routeBadgeTransferIcon.viewBoxX;
const transferIconViewBoxWidth = routeBadgeTransferIcon.viewBoxWidth;
const transferIconViewBoxHeight = routeBadgeTransferIcon.viewBoxHeight;
const transferIconColor = routeBadgeTransferIcon.color;
const currentStationAccent = routeBadgeCurrentCard.accent;
const transferIconPath = routeBadgeTransferIcon.path;

const StationAnchorPoint = () => <rect x="-0.5" y="-0.5" width="1" height="1" fill="transparent" />;

const RouteLineSegment = ({ color, width: segmentWidth }: { color: string; width: number }) => (
  <rect x="0" y={-lineThickness / 2} width={segmentWidth} height={lineThickness} fill={color} />
);

const RouteLineReference = ({ width: segmentWidth }: { width: number }) => (
  <rect x="0" y={-lineThickness / 2} width={segmentWidth} height={lineThickness} fill="transparent" />
);

const EndStationMarker = ({ fill }: { fill: string }) => (
  <g>
    <circle cx="0" cy="0" r={endStationRadius} fill={fill} />
    <circle cx="0" cy="0" r={endStationInnerRadius} fill="#ffffff" />
  </g>
);

const StationMarker = () => <circle cx="0" cy="0" r={smallStationRadius} fill="#ffffff" />;

const CurrentStationMarker = () => (
  <g>
    <circle cx="0" cy="0" r={currentOuterRadius} fill="#ff0000" />
    <circle cx="0" cy="0" r={currentInnerRadius} fill="#ffffff" />
  </g>
);

const DirectionArrow = ({ direction }: { direction: 'l' | 'r' }) => {
  const rotation = direction === 'l' ? 0 : 180;
  const translateX = direction === 'l' ? 0 : directionArrowBaseWidth * directionArrowScale;
  const translateY = direction === 'l' ? 0 : directionArrowBaseHeight * directionArrowScale;

  return (
    <g transform={`translate(${translateX} ${translateY}) rotate(${rotation}) scale(${directionArrowScale})`}>
      <path d={routeBadgeDirectionArrow.path} fill="#000000" />
    </g>
  );
};

const TransferStationIcon = ({ color, symbolId, targetHeight }: { color: string; symbolId: string; targetHeight: number }) => {
  const scaledWidth = (transferIconViewBoxWidth / transferIconViewBoxHeight) * targetHeight;

  return (
    <use
      href={`#${symbolId}`}
      x={-scaledWidth / 2}
      y={-targetHeight / 2}
      width={scaledWidth}
      height={targetHeight}
      color={color}
    />
  );
};

const TransferBadgeGroup = ({ lines }: { lines: TransferLine[] }) => {
  const gap = routeBadgeTransferLineId.gap;
  const badgeHeight = routeBadgeTransferLineId.badgeHeight;
  const supportedLines = lines
    .map((line) => ({ line, width: getLineIdBadgeWidth(line.id, badgeHeight) }))
    .filter((entry): entry is { line: TransferLine; width: number } => entry.width !== null);
  const widths = supportedLines.map((entry) => entry.width);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(supportedLines.length - 1, 0);
  let cursorX = -totalWidth / 2;

  return (
    <g>
      {supportedLines.map(({ line, width }, index) => {
        const x = cursorX;
        cursorX += width + gap;

        return (
          <g key={`${line.id}-${line.color}-${line.textColor}-${index}`}>
            <g transform={`translate(${x} 0)`}>
              <LineIdBadge lineId={line.id} color={line.color} textColor={line.textColor} height={badgeHeight} />
            </g>
          </g>
        );
      })}
    </g>
  );
};

const StationTextBlock = ({ showStationTypeIcons, station }: { showStationTypeIcons: boolean; station: StationItem }) => {
  const zhNameCondenseConfig = getRouteZhNameCondense(station.chName);
  const stationTypeIcon = showStationTypeIcons ? getStationTypeIcon(station.type) : null;

  return (
    <g>
      <text
        x="0"
        y="51"
        textAnchor="middle"
        fontSize="51px"
        style={zhTextStyle(zhNameCondenseConfig.letterSpacing)}
        transform={zhNameCondenseConfig.transform}
      >
        {stationTypeIcon ? <tspan fontFamily={njmetroDingsFontStack}>{stationTypeIcon}</tspan> : null}
        {station.chName}
      </text>
      <text x="0" y="80" textAnchor="middle" fontSize="20px" style={enTextStyle(1.2)}>
        {station.enName.toUpperCase()}
      </text>
    </g>
  );
};

const CurrentStationCardTextBlock = ({ showStationTypeIcons, station }: { showStationTypeIcons: boolean; station: StationItem }) => {
  const shouldCondenseZhName = station.chName.length >= 7;
  const zhNameCondenseConfig = getRouteZhNameCondense(station.chName);
  const stationTypeIcon = showStationTypeIcons ? getStationTypeIcon(station.type) : null;
  const textColor = '#ffffff';

  return (
    <g>
      <text
        x="0"
        y="51"
        textAnchor="middle"
        fontSize="51px"
        style={zhTextStyle(shouldCondenseZhName ? zhNameCondenseConfig.letterSpacing : 3, textColor)}
        transform={zhNameCondenseConfig.transform}
      >
        {stationTypeIcon ? <tspan fontFamily={njmetroDingsFontStack}>{stationTypeIcon}</tspan> : null}
        {station.chName}
      </text>
      <text x="0" y="80" textAnchor="middle" fontSize="20px" style={enTextStyle(1, textColor)}>
        {station.enName.toUpperCase()}
      </text>
    </g>
  );
};

const CurrentStationCard = ({ placeAbove, showStationTypeIcons, station }: { placeAbove: boolean; showStationTypeIcons: boolean; station: StationItem }) => {
  const textMeasureRef = useRef<SVGGElement | null>(null);
  const [textBox, setTextBox] = useState({ x: 0, y: 0, width: 182.5, height: 67 });
  const cardWidth = textBox.width + currentCardHorizontalPadding * 2;
  const cardHeight = textBox.height + currentCardTopPadding + currentCardBottomPadding;
  const cardX = -cardWidth / 2;
  const connectorY = placeAbove ? -currentCardConnectorHeight : 0;
  const cardY = placeAbove ? -(currentCardConnectorHeight + cardHeight) : currentCardConnectorHeight;
  const textTranslateX = -(textBox.x + textBox.width / 2);
  const textTranslateY = cardY + currentCardTopPadding - textBox.y;

  useLayoutEffect(() => {
    if (!textMeasureRef.current) {
      return;
    }

    const nextTextBox = textMeasureRef.current.getBBox();

    if (
      textBox.x !== nextTextBox.x ||
      textBox.y !== nextTextBox.y ||
      textBox.width !== nextTextBox.width ||
      textBox.height !== nextTextBox.height
    ) {
      setTextBox({
        x: nextTextBox.x,
        y: nextTextBox.y,
        width: nextTextBox.width,
        height: nextTextBox.height,
      });
    }
  }, [showStationTypeIcons, station.chName, station.enName, station.type, textBox]);

  return (
    <g>
      <rect x="-7.75" y={connectorY} width="15.5" height={currentCardConnectorHeight} fill={currentStationAccent} />
      <rect x={cardX} y={cardY} width={cardWidth} height={cardHeight} rx="16.5" fill={currentStationAccent} />

      <g transform={`translate(${textTranslateX} ${textTranslateY})`}>
        <g ref={textMeasureRef}>
          <CurrentStationCardTextBlock showStationTypeIcons={showStationTypeIcons} station={station} />
        </g>
      </g>
    </g>
  );
};

export function RouteBadge({ data }: RouteBadgeProps) {
  const { currentStnId, direction, idColor, showStationTypeIcons, totalLength, stnList } = data;
  const { anchor } = useSvgPositioner(width, height);
  const transferIconSymbolId = useId().replaceAll(':', '');
  const currentIndex = stnList.findIndex((station) => station.id === currentStnId);
  const safeCurrentIndex = currentIndex === -1 ? 0 : currentIndex;
  const terminusIndex = direction === 'l' ? 0 : Math.max(stnList.length - 1, 0);
  const terminusPointId = `station-point-${terminusIndex}`;
  const endpointIndices = stnList.length > 0 ? [...new Set([0, stnList.length - 1])] : [];
  const segmentCount = Math.max(stnList.length - 1, 0);
  const lineLength = Math.max(0, totalLength);
  const stnDis = segmentCount === 0 ? 0 : lineLength / segmentCount;
  const inactiveColor = '#d9d9d9';
  const activeSegmentWidth = direction === 'l' ? safeCurrentIndex * stnDis : (stnList.length - 1 - safeCurrentIndex) * stnDis;
  const inactiveSegmentWidth = Math.max(0, lineLength - activeSegmentWidth);
  const lineCenterYOffset = lineCenterY - height / 2;
  const routeContentOffsetX = direction === 'l' ? routeLayoutOffsetX : -routeLayoutOffsetX;
  const terminusMarkerRadius = currentIndex !== -1 && safeCurrentIndex === terminusIndex ? currentOuterRadius : endStationRadius;
  const arrowToTerminusGap = terminusMarkerRadius + directionArrowGap - 0.5;
  const getTransferStationIconColor = (index: number) => {
    if (index === safeCurrentIndex) {
      return currentStationAccent;
    }

    const isAheadStation = direction === 'l' ? index < safeCurrentIndex : index > safeCurrentIndex;

    return isAheadStation ? transferIconColor : inactiveColor;
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="badge-svg" role="img" aria-label="线路牌">
      <defs>
        <symbol id={transferIconSymbolId} viewBox={`${transferIconViewBoxX} 0 ${transferIconViewBoxWidth} ${transferIconViewBoxHeight}`}>
          <path fill="currentColor" d={transferIconPath} />
        </symbol>
      </defs>

      <rect x="0" y="0" width={width} height={height} fill="#ffffff" />
      <rect x="0" y="642.5" width={width} height="157.5" fill={idColor} />

      {anchor('station-point-0', <StationAnchorPoint />, {
        centerX: -lineLength / 2 + routeContentOffsetX,
        centerY: lineCenterYOffset,
      })}

      {direction === 'l'
        ? anchor('direction-arrow', <DirectionArrow direction="l" />, {
            right: { to: terminusPointId, edge: 'left', gap: arrowToTerminusGap },
            centerY: { to: terminusPointId, offset: 0 },
          })
        : anchor('direction-arrow', <DirectionArrow direction="r" />, {
            left: { to: terminusPointId, edge: 'right', gap: arrowToTerminusGap },
            centerY: { to: terminusPointId, offset: 0 },
          })}

      {stnList.slice(1).map((station, index) =>
        anchor(`station-point-${index + 1}`, <StationAnchorPoint />, {
          centerX: { to: `station-point-${index}`, offset: stnDis },
          centerY: { to: `station-point-${index}`, offset: 0 },
        }),
      )}

      {anchor('route-line-reference', <RouteLineReference width={lineLength} />, {
        left: { to: 'station-point-0', edge: 'left', gap: 0.5 },
        centerY: { to: 'station-point-0', offset: 0 },
      })}

      {activeSegmentWidth > 0
        ? anchor('route-line-active', <RouteLineSegment color={idColor} width={activeSegmentWidth} />, {
            left:
              direction === 'l'
                ? { to: 'station-point-0', edge: 'left', gap: 0.5 }
                : { to: `station-point-${safeCurrentIndex}`, edge: 'left', gap: 0.5 },
            centerY: { to: 'station-point-0', offset: 0 },
          })
        : null}

      {inactiveSegmentWidth > 0
        ? anchor('route-line-inactive', <RouteLineSegment color={inactiveColor} width={inactiveSegmentWidth} />, {
            left:
              direction === 'l'
                ? { to: `station-point-${safeCurrentIndex}`, edge: 'left', gap: 0.5 }
                : { to: 'station-point-0', edge: 'left', gap: 0.5 },
            centerY: { to: 'station-point-0', offset: 0 },
          })
        : null}

      {endpointIndices.map((index) => {
        if (index === safeCurrentIndex) {
          return null;
        }

        const fill = index === 0 ? (direction === 'l' ? idColor : inactiveColor) : direction === 'l' ? inactiveColor : idColor;

        return anchor(`station-end-${index}`, <EndStationMarker fill={fill} />, {
          centerX: { to: `station-point-${index}`, offset: 0 },
          centerY: { to: `station-point-${index}`, offset: 0 },
        });
      })}

      {stnList.map((station, index) => {
        const isCurrent = index === safeCurrentIndex;
        const isEndpoint = index === 0 || index === stnList.length - 1;
        const placeAbove = index % 2 === 0;
        const stationPointId = `station-point-${index}`;
        const stationMarkerId = isCurrent ? `station-current-${index}` : isEndpoint ? `station-end-${index}` : `station-marker-${index}`;
        const transferIconAnchorId = `station-transfer-icon-${index}`;
        const transferCircleDiameter = isCurrent ? currentInnerRadius * 2 : isEndpoint ? endStationInnerRadius * 2 : smallStationRadius * 2;
        const transferIconHeight = transferCircleDiameter * 0.8;

        return (
          <g key={station.id}>
            {!isCurrent && !isEndpoint
              ? anchor(stationMarkerId, <StationMarker />, {
                  centerX: { to: stationPointId, offset: 0 },
                  centerY: { to: stationPointId, offset: 0 },
                })
              : null}

            {isCurrent
              ? anchor(
                  `current-station-card-${index}`,
                  <CurrentStationCard placeAbove={placeAbove} showStationTypeIcons={showStationTypeIcons} station={station} />,
                  {
                  centerX: { to: stationPointId, offset: 0 },
                  ...(placeAbove
                    ? { bottom: { to: stationPointId, edge: 'bottom', gap: 0.5 } }
                    : { top: { to: stationPointId, edge: 'top', gap: 0.5 } }),
                },
                )
              : anchor(`station-label-${index}`, <StationTextBlock showStationTypeIcons={showStationTypeIcons} station={station} />, {
                  centerX: { to: stationPointId, offset: 0 },
                  ...(placeAbove
                    ? { bottom: { to: 'route-line-reference', edge: 'top', gap: topLabelGap } }
                    : { top: { to: 'route-line-reference', edge: 'bottom', gap: bottomLabelGap } }),
                })}

            {isCurrent
              ? anchor(stationMarkerId, <CurrentStationMarker />, {
                  centerX: { to: stationPointId, offset: 0 },
                  centerY: { to: stationPointId, offset: 0 },
                })
              : null}

            {station.transfer.length > 0
              ? anchor(
                  transferIconAnchorId,
                  <TransferStationIcon color={getTransferStationIconColor(index)} symbolId={transferIconSymbolId} targetHeight={transferIconHeight} />,
                  {
                    centerX: { to: stationMarkerId, offset: 0 },
                    centerY: { to: stationMarkerId, offset: 0 },
                  },
                )
              : null}

            {station.transfer.length > 0
              ? isCurrent
                ? anchor(`station-transfer-${index}`, <TransferBadgeGroup lines={station.transfer} />, {
                    centerX: { to: `current-station-card-${index}`, offset: 0 },
                    ...(placeAbove
                      ? { bottom: { to: `current-station-card-${index}`, edge: 'top', gap: currentCardGap } }
                      : { top: { to: `current-station-card-${index}`, edge: 'bottom', gap: currentCardGap } }),
                  })
                : anchor(`station-transfer-${index}`, <TransferBadgeGroup lines={station.transfer} />, {
                    centerX: { to: `station-label-${index}`, offset: 0 },
                    ...(placeAbove
                      ? { bottom: { to: `station-label-${index}`, edge: 'top', gap: currentCardGap } }
                      : { top: { to: `station-label-${index}`, edge: 'bottom', gap: currentCardGap } }),
                  })
              : null}
          </g>
        );
      })}
    </svg>
  );
}
