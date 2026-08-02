import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type SvgBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type AnchorEdge = 'left' | 'right' | 'top' | 'bottom';
type AnchorTarget = string;

const ANCHOR_CANVAS_TARGET = 'canvas';

type AnchorConstraint = {
  to?: AnchorTarget;
  edge?: AnchorEdge;
  gap?: number;
};

type CenterConstraint = {
  to?: AnchorTarget;
  offset?: number;
};

export type PositionConstraints = {
  left?: number | AnchorConstraint;
  right?: number | AnchorConstraint;
  top?: number | AnchorConstraint;
  bottom?: number | AnchorConstraint;
  centerX?: number | CenterConstraint;
  centerY?: number | CenterConstraint;
};

type PositionedSvgElementProps = Readonly<{
  localBoxes: Record<string, SvgBox>;
  resolvedBoxes: Record<string, SvgBox>;
  canvas: SvgBox;
  children: ReactNode;
  constraints: PositionConstraints;
  id: string;
  onMeasure: (id: string, localBox: SvgBox, resolvedBox: SvgBox) => void;
}>;

const areBoxesEqual = (left?: SvgBox, right?: SvgBox) => {
  if (!left || !right) {
    return false;
  }

  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  );
};

const getEdgeCoordinate = (box: SvgBox, edge: AnchorEdge) => {
  switch (edge) {
    case 'left':
      return box.x;
    case 'right':
      return box.x + box.width;
    case 'top':
      return box.y;
    case 'bottom':
      return box.y + box.height;
  }
};

const getTargetBox = (boxes: Record<string, SvgBox>, canvas: SvgBox, target: AnchorTarget = ANCHOR_CANVAS_TARGET) =>
  target === ANCHOR_CANVAS_TARGET ? canvas : boxes[target];

const toAnchorConstraint = (value: number | AnchorConstraint | undefined, defaultEdge: AnchorEdge): AnchorConstraint | null => {
  if (value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return { to: ANCHOR_CANVAS_TARGET, edge: defaultEdge, gap: value };
  }

  const target = value.to ?? ANCHOR_CANVAS_TARGET;

  return {
    to: target,
    edge: value.edge ?? defaultEdge,
    gap: value.gap ?? 0,
  };
};

const toCenterConstraint = (value: number | CenterConstraint | undefined): CenterConstraint | null => {
  if (value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return { to: ANCHOR_CANVAS_TARGET, offset: value };
  }

  const target = value.to ?? ANCHOR_CANVAS_TARGET;

  return {
    to: target,
    offset: value.offset ?? 0,
  };
};

const collectConstraintTargets = (constraints: PositionConstraints) => {
  const targets = new Set<string>();
  const anchorKeys: Array<keyof PositionConstraints> = ['left', 'right', 'top', 'bottom', 'centerX', 'centerY'];

  for (const key of anchorKeys) {
    const value = constraints[key];

    if (value && typeof value === 'object' && 'to' in value) {
      const target = value.to;

      if (target && target !== ANCHOR_CANVAS_TARGET) {
        targets.add(target);
      }
    }
  }

  return [...targets];
};

const detectAnchorCycle = (graph: Map<string, string[]>, startId: string) => {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const path: string[] = [];

  const visit = (nodeId: string): string[] | null => {
    if (visiting.has(nodeId)) {
      const cycleStartIndex = path.indexOf(nodeId);
      return cycleStartIndex === -1 ? [nodeId, nodeId] : [...path.slice(cycleStartIndex), nodeId];
    }

    if (visited.has(nodeId)) {
      return null;
    }

    visiting.add(nodeId);
    path.push(nodeId);

    for (const targetId of graph.get(nodeId) ?? []) {
      const cyclePath = visit(targetId);

      if (cyclePath) {
        return cyclePath;
      }
    }

    path.pop();
    visiting.delete(nodeId);
    visited.add(nodeId);
    return null;
  };

  return visit(startId);
};

const computeAxisTranslation = (
  box: SvgBox,
  boxes: Record<string, SvgBox>,
  canvas: SvgBox,
  primary: AnchorConstraint | null,
  secondary: AnchorConstraint | null,
  center: CenterConstraint | null,
  axis: 'x' | 'y',
): number => {
  const boxOrigin = axis === 'x' ? box.x : box.y;
  const boxSize = axis === 'x' ? box.width : box.height;

  if (primary) {
    const target = getTargetBox(boxes, canvas, primary.to);
    if (!target) {
      return 0;
    }
    const edge = primary.edge ?? (axis === 'x' ? 'left' : 'top');
    return getEdgeCoordinate(target, edge) + (primary.gap ?? 0) - boxOrigin;
  }

  if (secondary) {
    const target = getTargetBox(boxes, canvas, secondary.to);
    if (!target) {
      return 0;
    }
    const edge = secondary.edge ?? (axis === 'x' ? 'right' : 'bottom');
    return getEdgeCoordinate(target, edge) - (secondary.gap ?? 0) - (boxOrigin + boxSize);
  }

  if (center) {
    const target = getTargetBox(boxes, canvas, center.to);
    if (!target) {
      return 0;
    }
    const targetCenter = axis === 'x' ? target.x + target.width / 2 : target.y + target.height / 2;
    return targetCenter + (center.offset ?? 0) - (boxOrigin + boxSize / 2);
  }

  return 0;
};

const computeTranslation = (box: SvgBox, boxes: Record<string, SvgBox>, canvas: SvgBox, constraints: PositionConstraints) => {
  const left = toAnchorConstraint(constraints.left, 'left');
  const right = toAnchorConstraint(constraints.right, 'right');
  const top = toAnchorConstraint(constraints.top, 'top');
  const bottom = toAnchorConstraint(constraints.bottom, 'bottom');
  const centerX = toCenterConstraint(constraints.centerX);
  const centerY = toCenterConstraint(constraints.centerY);

  const translateX = computeAxisTranslation(box, boxes, canvas, left, right, centerX, 'x');
  const translateY = computeAxisTranslation(box, boxes, canvas, top, bottom, centerY, 'y');

  return { translateX, translateY };
};

function PositionedSvgElement({ localBoxes, resolvedBoxes, canvas, children, constraints, id, onMeasure }: PositionedSvgElementProps) {
  const contentRef = useRef<SVGGElement | null>(null);
  const selfLocalBox = localBoxes[id];
  const dependentTargets = useMemo(() => collectConstraintTargets(constraints), [constraints]);

  const { translateX, translateY } = selfLocalBox
    ? computeTranslation(selfLocalBox, resolvedBoxes, canvas, constraints)
    : { translateX: 0, translateY: 0 };

  const isReady = Boolean(selfLocalBox) && dependentTargets.every((targetId) => Boolean(resolvedBoxes[targetId]));

  useLayoutEffect(() => {
    if (!contentRef.current) {
      return;
    }

    const nextBox = contentRef.current.getBBox();
    const normalizedBox = {
      x: nextBox.x,
      y: nextBox.y,
      width: nextBox.width,
      height: nextBox.height,
    };

    const resolvedBox = {
      x: normalizedBox.x + translateX,
      y: normalizedBox.y + translateY,
      width: normalizedBox.width,
      height: normalizedBox.height,
    };

    if (!areBoxesEqual(localBoxes[id], normalizedBox) || !areBoxesEqual(resolvedBoxes[id], resolvedBox)) {
      onMeasure(id, normalizedBox, resolvedBox);
    }
  }, [children, id, localBoxes, onMeasure, resolvedBoxes, translateX, translateY]);

  return (
    <g ref={contentRef} visibility={isReady ? 'visible' : 'hidden'} transform={`translate(${translateX} ${translateY})`}>
      {children}
    </g>
  );
}

export function useSvgPositioner(width: number, height: number) {
  const [localBoxes, setLocalBoxes] = useState<Record<string, SvgBox>>({});
  const [resolvedBoxes, setResolvedBoxes] = useState<Record<string, SvgBox>>({});
  const renderConstraintGraph = new Map<string, string[]>();

  const canvas = useMemo(
    () => ({
      x: 0,
      y: 0,
      width,
      height,
    }),
    [height, width],
  );

  const onMeasure = useCallback((id: string, localBox: SvgBox, resolvedBox: SvgBox) => {
    setLocalBoxes((current) => {
      if (areBoxesEqual(current[id], localBox)) {
        return current;
      }

      return {
        ...current,
        [id]: localBox,
      };
    });

    setResolvedBoxes((current) => {
      if (areBoxesEqual(current[id], resolvedBox)) {
        return current;
      }

      return {
        ...current,
        [id]: resolvedBox,
      };
    });
  }, []);

  const anchor = (id: string, element: ReactNode, constraints: PositionConstraints) => {
    const targets = collectConstraintTargets(constraints);

    // Child components may call `anchor` in their render body. React Strict Mode
    // double-invokes those children while reusing the parent's Map from one parent
    // render, so a hard throw on duplicate ids blanks the whole tree.
    if (!renderConstraintGraph.has(id)) {
      renderConstraintGraph.set(id, targets);

      const cyclePath = detectAnchorCycle(renderConstraintGraph, id);

      if (cyclePath) {
        throw new Error(`anchor() does not allow cyclic dependencies: ${cyclePath.join(' -> ')}`);
      }
    }

    return (
      <PositionedSvgElement
        key={id}
        canvas={canvas}
        constraints={constraints}
        id={id}
        localBoxes={localBoxes}
        onMeasure={onMeasure}
        resolvedBoxes={resolvedBoxes}
      >
        {element}
      </PositionedSvgElement>
    );
  };

  return { anchor, position: anchor, resolvedBoxes };
}