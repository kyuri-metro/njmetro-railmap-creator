import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { getRouteZhNameCondense, type BadgeTextCondenseConfig } from '../badgeTextCondense';
import {
  collectTerminusStationIds,
  collectTrackEdges,
  hasBranchGeometry,
  layoutBranchRoute,
} from '../branchLayout';
import { computeActiveTrackEdgeKeys, isTrackEdgeActive } from '../branchReachability';
import type { GeneratorState, StationItem, TransferLine } from '../features/generatorSlice';
import { flattenStationList } from '../stationListTopology';
import { njmetroDingsFontStack, sansLatinFontStack, sansZhFontStack } from '../fontStacks';
import { getLineIdBadgeWidth } from '../lineIdBadgeMetrics';
import { measureBadgeTextWidth } from '../measureBadgeText';
import {
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
import { getBadgeCanvasSizes } from '../trainTypeLayout';
import { LineIdBadge } from './LineIdBadge';
import { useSvgPositioner } from './svgPositioning';

type RouteBadgeProps = Readonly<{
  data: GeneratorState;
}>;

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

const routeZhNameFontSize = 51;

/** 从 `scale(sx, 1)` 取出水平缩放；无 transform 时为 1。 */
const routeZhNameScaleX = (transform: string | undefined): number => {
  if (!transform) {
    return 1;
  }

  const match = /^scale\(([^,\s]+)/.exec(transform);
  const scaleX = match ? Number(match[1]) : Number.NaN;
  return Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1;
};

/**
 * 线路图中文站名行：有站类型图标且站名被水平压缩时，把图标拆出测宽居中，
 * 避免 dings 图标与汉字一起被 scaleX 压扁。
 */
const RouteZhNameRow = ({
  chName,
  condense,
  fill = '#000000',
  letterSpacing,
  stationTypeIcon,
}: {
  chName: string;
  condense: BadgeTextCondenseConfig;
  fill?: string;
  letterSpacing: number | undefined;
  stationTypeIcon: string | null;
}) => {
  const scaleX = routeZhNameScaleX(condense.transform);

  if (!stationTypeIcon || scaleX === 1) {
    return (
      <text
        x="0"
        y={routeZhNameFontSize}
        textAnchor="middle"
        fontSize={`${routeZhNameFontSize}px`}
        style={zhTextStyle(letterSpacing, fill)}
        transform={condense.transform}
      >
        {stationTypeIcon ? <tspan fontFamily={njmetroDingsFontStack}>{stationTypeIcon}</tspan> : null}
        {chName}
      </text>
    );
  }

  const spacing = letterSpacing ?? 0;
  const iconWidth = measureBadgeTextWidth(stationTypeIcon, njmetroDingsFontStack, routeZhNameFontSize);
  const nameWidth = measureBadgeTextWidth(chName, sansZhFontStack, routeZhNameFontSize, spacing, scaleX);
  const totalWidth = iconWidth + spacing + nameWidth;
  const originX = -totalWidth / 2;
  const nameTranslateX = originX + iconWidth + spacing;

  return (
    <g>
      <text
        x={originX}
        y={routeZhNameFontSize}
        textAnchor="start"
        fontSize={`${routeZhNameFontSize}px`}
        style={{ fontFamily: njmetroDingsFontStack, fill }}
      >
        {stationTypeIcon}
      </text>
      <g transform={`translate(${nameTranslateX} 0) scale(${scaleX}, 1)`}>
        <text
          x="0"
          y={routeZhNameFontSize}
          textAnchor="start"
          fontSize={`${routeZhNameFontSize}px`}
          style={zhTextStyle(letterSpacing, fill)}
        >
          {chName}
        </text>
      </g>
    </g>
  );
};

const lineCenterY = routeBadgeLine.centerY;
const lineThickness = routeBadgeLine.thickness;
const smallStationRadius = routeBadgeStationRadii.small;
const endStationRadius = routeBadgeStationRadii.endOuter;
const endStationInnerRadius = routeBadgeStationRadii.endInner;
const currentOuterRadius = routeBadgeStationRadii.currentOuter;
const currentInnerRadius = routeBadgeStationRadii.currentInner;
const directionArrowBaseWidth = routeBadgeDirectionArrow.baseWidth;
const directionArrowBaseHeight = routeBadgeDirectionArrow.baseHeight;
const directionArrowGap = routeBadgeDirectionArrow.gap;
const directionArrowScale = routeBadgeDirectionArrowScale;
const routeLayoutOffsetX = routeBadgeLayoutOffsetX;
const topLabelGap = routeBadgeGaps.topLabel;
const bottomLabelGap = routeBadgeGaps.bottomLabel;
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

/** 水平 1:2 胶囊：短轴 h = 圆直径，中间正方形边长 a = h，总宽 2h。 */
const CapsuleStationMarker = () => {
  const h = smallStationRadius * 2;
  return <rect x={-h} y={-h / 2} width={2 * h} height={h} rx={h / 2} ry={h / 2} fill="#ffffff" />;
};

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

const TransferStationIcon = ({
  color,
  symbolId,
  targetHeight,
  rotateDeg = 0,
}: {
  color: string;
  symbolId: string;
  targetHeight: number;
  rotateDeg?: number;
}) => {
  const scaledWidth = (transferIconViewBoxWidth / transferIconViewBoxHeight) * targetHeight;

  const icon = (
    <use
      href={`#${symbolId}`}
      x={-scaledWidth / 2}
      y={-targetHeight / 2}
      width={scaledWidth}
      height={targetHeight}
      color={color}
    />
  );

  if (rotateDeg === 0) {
    return icon;
  }

  return <g transform={`rotate(${rotateDeg})`}>{icon}</g>;
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
      <RouteZhNameRow
        chName={station.chName}
        condense={zhNameCondenseConfig}
        letterSpacing={zhNameCondenseConfig.letterSpacing}
        stationTypeIcon={stationTypeIcon}
      />
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
      <RouteZhNameRow
        chName={station.chName}
        condense={zhNameCondenseConfig}
        fill={textColor}
        letterSpacing={shouldCondenseZhName ? zhNameCondenseConfig.letterSpacing : 3}
        stationTypeIcon={stationTypeIcon}
      />
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

const getEndpointFill = (index: number, direction: 'l' | 'r', idColor: string, inactiveColor: string): string => {
  if (index === 0) {
    return direction === 'l' ? idColor : inactiveColor;
  }
  return direction === 'l' ? inactiveColor : idColor;
};

const getStationMarkerId = (isCurrent: boolean, isEndpoint: boolean, index: number): string => {
  if (isCurrent) {
    return `station-current-${index}`;
  }
  if (isEndpoint) {
    return `station-end-${index}`;
  }
  return `station-marker-${index}`;
};

const getTransferCircleDiameter = (isCurrent: boolean, isEndpoint: boolean): number => {
  if (isCurrent) {
    return currentInnerRadius * 2;
  }
  if (isEndpoint) {
    return endStationInnerRadius * 2;
  }
  return smallStationRadius * 2;
};

type RouteStationRowProps = Readonly<{
  station: StationItem;
  index: number;
  safeCurrentIndex: number;
  isEndpoint: boolean;
  placeAbove: boolean;
  showStationTypeIcons: boolean;
  useCapsuleTransferMarkers: boolean;
  transferIconSymbolId: string;
  getTransferStationIconColor: (index: number) => string;
  anchor: ReturnType<typeof useSvgPositioner>['anchor'];
}>;

const getVerticalCardConstraints = (placeAbove: boolean, anchorId: string, gap: number) =>
  placeAbove
    ? { bottom: { to: anchorId, edge: 'top' as const, gap } }
    : { top: { to: anchorId, edge: 'bottom' as const, gap } };

const RouteStationRow = ({
  station,
  index,
  safeCurrentIndex,
  isEndpoint,
  placeAbove,
  showStationTypeIcons,
  useCapsuleTransferMarkers,
  transferIconSymbolId,
  getTransferStationIconColor,
  anchor,
}: RouteStationRowProps) => {
  const isCurrent = index === safeCurrentIndex;
  const stationPointId = `station-point-${index}`;
  const stationMarkerId = getStationMarkerId(isCurrent, isEndpoint, index);
  const transferIconAnchorId = `station-transfer-icon-${index}`;
  const useCapsule =
    useCapsuleTransferMarkers && station.transfer.length > 0 && !isCurrent && !isEndpoint;
  // 胶囊内图标 rotate(90) 后视觉宽度 = 未旋转高度；固定为 32（SVG 用户单位）。
  const transferIconHeight = useCapsule ? 32 : getTransferCircleDiameter(isCurrent, isEndpoint) * 0.8;

  const labelAnchor = isCurrent
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
      });

  let transferBadgeAnchor = null;
  if (station.transfer.length > 0) {
    const labelAnchorId = isCurrent ? `current-station-card-${index}` : `station-label-${index}`;
    transferBadgeAnchor = anchor(`station-transfer-${index}`, <TransferBadgeGroup lines={station.transfer} />, {
      centerX: { to: labelAnchorId, offset: 0 },
      ...getVerticalCardConstraints(placeAbove, labelAnchorId, currentCardGap),
    });
  }

  return (
    <g key={station.id}>
      {!isCurrent && !isEndpoint
        ? anchor(stationMarkerId, useCapsule ? <CapsuleStationMarker /> : <StationMarker />, {
            centerX: { to: stationPointId, offset: 0 },
            centerY: { to: stationPointId, offset: 0 },
          })
        : null}

      {labelAnchor}

      {isCurrent
        ? anchor(stationMarkerId, <CurrentStationMarker />, {
            centerX: { to: stationPointId, offset: 0 },
            centerY: { to: stationPointId, offset: 0 },
          })
        : null}

      {station.transfer.length > 0
        ? anchor(
            transferIconAnchorId,
            <TransferStationIcon
              color={getTransferStationIconColor(index)}
              symbolId={transferIconSymbolId}
              targetHeight={transferIconHeight}
              rotateDeg={useCapsule ? 90 : 0}
            />,
            {
              centerX: { to: stationMarkerId, offset: 0 },
              centerY: { to: stationMarkerId, offset: 0 },
            },
          )
        : null}

      {transferBadgeAnchor}
    </g>
  );
};

export function RouteBadge({ data }: RouteBadgeProps) {
  const {
    currentStnId,
    direction,
    idColor,
    showStationTypeIcons,
    useCapsuleTransferMarkers,
    totalLength,
    branchHeight,
    stnList,
    trainType,
  } = data;
  const stations = flattenStationList(stnList);
  const stationById = new Map(stations.map((station) => [station.id, station]));
  const layout = layoutBranchRoute(stnList, totalLength, branchHeight);
  const pointById = new Map(layout.stations.map((point) => [point.stationId, point]));
  const drawOrder = layout.stations
    .map((point) => stationById.get(point.stationId))
    .filter((station): station is StationItem => station !== undefined);
  const indexById = new Map(drawOrder.map((station, index) => [station.id, index]));
  const terminusIds = collectTerminusStationIds(stnList);
  const trackEdges = collectTrackEdges(stnList);
  const branched = hasBranchGeometry(stnList);
  const activeEdgeKeys = computeActiveTrackEdgeKeys(
    stnList,
    currentStnId,
    direction,
    layout.stations,
    trackEdges,
  );

  const { route: width, height } = getBadgeCanvasSizes(trainType);
  const { anchor } = useSvgPositioner(width, height);
  const transferIconSymbolId = useId().replaceAll(':', '');
  const currentIndex = drawOrder.findIndex((station) => station.id === currentStnId);
  const safeCurrentIndex = currentIndex === -1 ? 0 : currentIndex;
  const travelTerminusId =
    direction === 'l'
      ? [...terminusIds].sort((a, b) => (pointById.get(a)?.x ?? 0) - (pointById.get(b)?.x ?? 0))[0]
      : [...terminusIds].sort((a, b) => (pointById.get(b)?.x ?? 0) - (pointById.get(a)?.x ?? 0))[0];
  const terminusIndex = travelTerminusId !== undefined ? (indexById.get(travelTerminusId) ?? 0) : 0;
  const terminusPointId = `station-point-${terminusIndex}`;
  const lineLength = Math.max(0, totalLength);
  const inactiveColor = '#d9d9d9';
  const lineCenterYOffset = lineCenterY - height / 2;
  const routeContentOffsetX = direction === 'l' ? routeLayoutOffsetX : -routeLayoutOffsetX;
  const originX = -lineLength / 2 + routeContentOffsetX;
  const terminusMarkerRadius =
    currentIndex !== -1 && safeCurrentIndex === terminusIndex ? currentOuterRadius : endStationRadius;
  const arrowToTerminusGap = terminusMarkerRadius + directionArrowGap - 0.5;

  const getTransferStationIconColor = (index: number) => {
    if (index === safeCurrentIndex) {
      return currentStationAccent;
    }

    const isAheadStation = direction === 'l' ? index < safeCurrentIndex : index > safeCurrentIndex;

    return isAheadStation ? transferIconColor : inactiveColor;
  };

  const edgeColor = (fromId: string, toId: string) =>
    isTrackEdgeActive(activeEdgeKeys, fromId, toId) ? idColor : inactiveColor;

  const toView = (stationId: string) => {
    const point = pointById.get(stationId);
    return {
      x: width / 2 + originX + (point?.x ?? 0),
      y: height / 2 + lineCenterYOffset + (point?.y ?? 0),
    };
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

      {drawOrder.map((station, index) => {
        const point = pointById.get(station.id);
        return anchor(`station-point-${index}`, <StationAnchorPoint />, {
          centerX: originX + (point?.x ?? 0),
          centerY: lineCenterYOffset + (point?.y ?? 0),
        });
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

      {drawOrder.length > 0
        ? anchor('route-line-reference', <RouteLineReference width={lineLength} />, {
            left: { to: 'station-point-0', edge: 'left', gap: 0.5 },
            centerY: { to: 'station-point-0', offset: 0 },
          })
        : null}

      {trackEdges.map((edge, edgeIndex) => {
        const from = toView(edge.fromStationId);
        const to = toView(edge.toStationId);
        return (
          <line
            key={`track-${edgeIndex}-${edge.fromStationId}-${edge.toStationId}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={edgeColor(edge.fromStationId, edge.toStationId)}
            strokeWidth={lineThickness}
            strokeLinecap="round"
          />
        );
      })}

      {drawOrder.map((station, index) => {
        if (index === safeCurrentIndex || !terminusIds.has(station.id)) {
          return null;
        }

        const currentX = pointById.get(drawOrder[safeCurrentIndex]?.id)?.x ?? 0;
        const stationX = pointById.get(station.id)?.x ?? 0;
        const endpointFill = branched
          ? direction === 'l'
            ? stationX <= currentX
              ? idColor
              : inactiveColor
            : stationX >= currentX
              ? idColor
              : inactiveColor
          : getEndpointFill(index, direction, idColor, inactiveColor);

        return anchor(`station-end-${index}`, <EndStationMarker fill={endpointFill} />, {
          centerX: { to: `station-point-${index}`, offset: 0 },
          centerY: { to: `station-point-${index}`, offset: 0 },
        });
      })}

      {drawOrder.map((station, index) => {
        const point = pointById.get(station.id);
        const placeAbove = point && point.y !== 0 ? point.y < 0 : index % 2 === 0;

        return (
          <RouteStationRow
            key={station.id}
            station={station}
            index={index}
            safeCurrentIndex={safeCurrentIndex}
            isEndpoint={terminusIds.has(station.id)}
            placeAbove={placeAbove}
            showStationTypeIcons={showStationTypeIcons}
            useCapsuleTransferMarkers={useCapsuleTransferMarkers}
            transferIconSymbolId={transferIconSymbolId}
            getTransferStationIconColor={getTransferStationIconColor}
            anchor={anchor}
          />
        );
      })}
    </svg>
  );
}
