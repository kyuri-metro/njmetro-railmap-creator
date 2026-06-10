import { useLayoutEffect } from 'react';
import { applyLineThemePalette } from '../lineThemePalette';

/** Sync `--theme-100`～`--theme-900` with the line id block background hue (Harmonizer + apcach). */
export function useLineThemePalette(idColor: string) {
  useLayoutEffect(() => {
    applyLineThemePalette(document.documentElement, idColor);
  }, [idColor]);
}
