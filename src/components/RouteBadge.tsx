import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { GeneratorState, StationItem, TransferLine } from '../features/generatorSlice';
import { njmetroDingsFontStack, sansLatinFontStack, sansZhFontStack } from '../fontStacks';
import { LineIdBadge, getLineIdBadgeWidth } from './LineIdBadge';
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

const width = 7412;
const height = 800;
const lineCenterY = 315.75;
const lineThickness = 46;
const smallStationRadius = 17;
const endStationRadius = 33.5;
const endStationInnerRadius = 25.5;
const currentOuterRadius = 37.5;
const currentInnerRadius = 28;
const directionArrowBaseWidth = 340;
const directionArrowBaseHeight = 294.5;
const directionArrowWidth = 355;
const directionArrowGap = 105;
const directionArrowScale = directionArrowWidth / directionArrowBaseWidth;
const routeLayoutOffsetX = (directionArrowWidth + directionArrowGap) / 2;
const topLabelGap = 11;
const bottomLabelGap = 11;
const topTransferGap = 130.25;
const bottomTransferGap = 142.75;
const currentCardConnectorHeight = lineThickness / 2 + 35.5;
const currentCardGap = 12.5;
const currentCardHorizontalPadding = 23.5;
const currentCardTopPadding = 12;
const currentCardBottomPadding = 10.5;
const transferIconViewBoxX = -10;
const transferIconViewBoxWidth = 797;
const transferIconViewBoxHeight = 1000;
const transferIconColor = '#000000';
const currentStationAccent = '#142966';
const transferIconPath =
  'M 494,1000 C 494,983 646,881 646,669 C 646,638 640,535 565,452 L 539,423 C 455,500 539,423 455,500 C 448,188 455,500 448,188 L 757,224 L 673,301 L 702,333 C 729,362 787,425 787,566 C 787,858 499,1000 494,1000 Z M 283,0 C 283,17 131,119 131,331 C 131,362 137,464 212,547 L 238,576 C 322,499 238,576 322,499 C 329,810 322,499 329,810 L 20,774 L 105,697 L 76,665 C 49,636 -10,573 -10,432 C -10,142 278,0 283,0 Z';

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
      <path d="m 145.5,0 h 71 L 99.5,119 H 340 v 55 H 100 l 120.5,120.5 h -74 L 0,148 Z" fill="#000000" />
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

const getZhNameCondenseConfig = (name: string) => {
  if (name.length >= 14) {
    return {
      letterSpacing: 0,
      transform: 'scale(0.5,1)',
    };
  }

  if (name.length >= 7) {
    return {
      letterSpacing: 0,
      transform: 'scale(0.8,1)',
    };
  }

  return {
    letterSpacing: 4,
    transform: undefined,
  };
};

const TransferBadgeGroup = ({ lines }: { lines: TransferLine[] }) => {
  const gap = 12.5;
  const badgeHeight = 68.5;
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
  const zhNameCondenseConfig = getZhNameCondenseConfig(station.chName);
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
  const zhNameCondenseConfig = getZhNameCondenseConfig(station.chName);
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
