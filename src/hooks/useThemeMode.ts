import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

const themeStorageKey = 'site-theme';
const themeTransitionLockClassName = 'theme-transition-lock';

const getInitialThemeMode = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedTheme = window.localStorage.getItem(themeStorageKey);

  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

let themeTransitionLockToken = 0;

const scheduleThemeTransitionUnlock = () => {
  themeTransitionLockToken += 1;
  const currentLockToken = themeTransitionLockToken;

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (themeTransitionLockToken !== currentLockToken) {
        return;
      }

      document.documentElement.classList.remove(themeTransitionLockClassName);
    });
  });
};

const applyThemeMode = (themeMode: ThemeMode, disableTransitions = false) => {
  const rootElement = document.documentElement;

  if (disableTransitions) {
    rootElement.classList.add(themeTransitionLockClassName);
  }

  rootElement.classList.toggle('dark', themeMode === 'dark');
  rootElement.classList.toggle('light', themeMode === 'light');
  rootElement.style.colorScheme = themeMode;

  if (disableTransitions) {
    scheduleThemeTransitionUnlock();
  }
};

export const useThemeMode = () => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  useEffect(() => {
    const initialThemeMode = getInitialThemeMode();
    setThemeMode(initialThemeMode);
    applyThemeMode(initialThemeMode);
  }, []);

  const toggleTheme = () => {
    const nextThemeMode: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextThemeMode);
    window.localStorage.setItem(themeStorageKey, nextThemeMode);
    applyThemeMode(nextThemeMode, true);
  };

  return { themeMode, toggleTheme };
};
