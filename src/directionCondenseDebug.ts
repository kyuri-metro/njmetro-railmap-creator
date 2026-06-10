import type { DirectionLayoutConstraintSnapshot } from './directionBadgeLayout';
import type { DirectionCondenseMove, DirectionCondenseState, DirectionLineKey } from './badgeTextCondense';

const DEBUG_PREFIX = '[direction-condense]';

export const isDirectionCondenseDebugEnabled = () => import.meta.env.DEV;

export const logDirectionCondenseDebug = (message: string, payload?: unknown) => {
  if (!isDirectionCondenseDebugEnabled()) {
    return;
  }

  if (payload === undefined) {
    console.debug(DEBUG_PREFIX, message);
    return;
  }

  console.debug(DEBUG_PREFIX, message, payload);
};

export type DirectionCondenseDebugSnapshot = {
  direction: 'l' | 'r';
  lineBadgeWidth: number;
  names: Record<DirectionLineKey, string>;
  totalWidth: number;
  constraints: DirectionLayoutConstraintSnapshot;
  initialTiers: DirectionCondenseState;
  finalTiers: DirectionCondenseState;
  lineWidths: Record<DirectionLineKey, number>;
  maxTiers: Record<DirectionLineKey, number>;
  greedySteps: Array<{ step: number; move: DirectionCondenseMove; totalWidth: number }>;
  stoppedBecause: 'fits' | 'no-candidates' | 'no-improvement';
};

export const logDirectionCondenseSnapshot = (snapshot: DirectionCondenseDebugSnapshot) => {
  if (!isDirectionCondenseDebugEnabled()) {
    return;
  }

  logDirectionCondenseDebug('resolve snapshot', snapshot);

  if (!snapshot.constraints.fits && snapshot.stoppedBecause === 'no-candidates') {
    logDirectionCondenseDebug('still overlapping but all lines are already at the greedy tier cap', {
      maxTiers: snapshot.maxTiers,
      finalTiers: snapshot.finalTiers,
      constraints: snapshot.constraints,
    });
  }

  if (!snapshot.constraints.fits && snapshot.stoppedBecause === 'no-improvement') {
    logDirectionCondenseDebug('still overlapping but no candidate would reduce total width', {
      totalWidth: snapshot.totalWidth,
      constraints: snapshot.constraints,
      finalTiers: snapshot.finalTiers,
    });
  }
};
