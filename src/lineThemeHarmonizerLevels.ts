/** Harmonizer color levels (P3 + even chroma caps). See https://harmonizer.evilmartians.com/ */
export type HarmonizerRefBackground = 'black' | 'white';

export type HarmonizerThemeLevel = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export type HarmonizerThemeLevelSpec = {
  level: HarmonizerThemeLevel;
  apca: number;
  refBackground: HarmonizerRefBackground;
  chromaCap: number;
};

export const DEFAULT_LINE_THEME_HUE = 213;

export const HARMONIZER_THEME_LEVELS: HarmonizerThemeLevelSpec[] = [
  { level: 100, apca: 100, refBackground: 'black', chromaCap: 0.02 },
  { level: 200, apca: 90, refBackground: 'black', chromaCap: 0.05 },
  { level: 300, apca: 77, refBackground: 'black', chromaCap: 0.095 },
  { level: 400, apca: 65, refBackground: 'black', chromaCap: 0.144 },
  { level: 500, apca: 51, refBackground: 'black', chromaCap: 0.159 },
  { level: 600, apca: 65, refBackground: 'white', chromaCap: 0.138 },
  { level: 700, apca: 77, refBackground: 'white', chromaCap: 0.117 },
  { level: 800, apca: 90, refBackground: 'white', chromaCap: 0.092 },
  { level: 900, apca: 100, refBackground: 'white', chromaCap: 0.067 },
];
