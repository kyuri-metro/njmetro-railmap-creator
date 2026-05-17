import { useEffect, useRef, useState, type RefObject } from 'react';

/** Fallback when computed transition duration is unavailable (see `--transition-overlay` in common-css). */
const FALLBACK_OVERLAY_MS = 200;

function parseCssTime(value: string): number {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '0') {
    return 0;
  }
  if (trimmed.endsWith('ms')) {
    return Number.parseFloat(trimmed);
  }
  if (trimmed.endsWith('s')) {
    return Number.parseFloat(trimmed) * 1000;
  }
  return Number.parseFloat(trimmed) || 0;
}

function getMaxTransitionMs(el: HTMLElement): number {
  const style = getComputedStyle(el);
  const durations = style.transitionDuration.split(',').map(parseCssTime);
  const delays = style.transitionDelay.split(',').map(parseCssTime);
  let max = 0;
  const count = Math.max(durations.length, delays.length, 1);

  for (let i = 0; i < count; i += 1) {
    const duration = durations[i % durations.length] ?? durations[0] ?? 0;
    const delay = delays[i % delays.length] ?? delays[0] ?? 0;
    max = Math.max(max, duration + delay);
  }

  return max > 0 ? max : FALLBACK_OVERLAY_MS;
}

function waitForSubtreeTransitions(el: HTMLElement, onDone: () => void): () => void {
  let settled = false;
  let debounceId = 0;
  let safetyId = 0;

  const cleanup = () => {
    el.removeEventListener('transitionend', onTransitionEnd);
    window.clearTimeout(debounceId);
    window.clearTimeout(safetyId);
  };

  const finish = () => {
    if (settled) {
      return;
    }
    settled = true;
    cleanup();
    onDone();
  };

  const onTransitionEnd = (event: TransitionEvent) => {
    if (event.target instanceof Node && !el.contains(event.target)) {
      return;
    }
    window.clearTimeout(debounceId);
    debounceId = window.setTimeout(finish, 0);
  };

  safetyId = window.setTimeout(finish, getMaxTransitionMs(el) + 50);
  el.addEventListener('transitionend', onTransitionEnd);

  return () => {
    if (!settled) {
      settled = true;
      cleanup();
    }
  };
}

export function useOverlayPresence<T extends HTMLElement = HTMLElement>(active: boolean) {
  const overlayRef = useRef<T | null>(null);
  const [mounted, setMounted] = useState(active);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (active) {
      setMounted(true);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setIsOpen(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }

    setIsOpen(false);

    let cancelWait: (() => void) | undefined;
    let exitRaf = 0;

    exitRaf = requestAnimationFrame(() => {
      const el = overlayRef.current;
      if (!el) {
        setMounted(false);
        return;
      }

      cancelWait = waitForSubtreeTransitions(el, () => setMounted(false));
    });

    return () => {
      cancelAnimationFrame(exitRaf);
      cancelWait?.();
    };
  }, [active]);

  return { mounted, isOpen, overlayRef };
}

export function withOverlayOpen(className: string, isOpen: boolean) {
  return isOpen ? `${className} is-open` : className;
}

/** Attach the same DOM node to multiple refs (e.g. layout measure + transition root). */
export function mergeOverlayRefs<T extends HTMLElement>(
  overlayRef: RefObject<T | null>,
  ...refs: Array<RefObject<T | null> | ((node: T | null) => void) | null | undefined>
) {
  return (node: T | null) => {
    overlayRef.current = node;
    for (const ref of refs) {
      if (!ref) {
        continue;
      }
      if (typeof ref === 'function') {
        ref(node);
        continue;
      }
      ref.current = node;
    }
  };
}
