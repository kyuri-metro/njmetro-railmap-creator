export const OVERLAY_IDS = {
  about: 'about',
  autosaveList: 'autosave-list',
  autosaveRestore: 'autosave-restore',
  badgeDownload: 'badge-download',
  builtinUnavailable: 'builtin-unavailable',
  exampleModal: 'example-modal',
  kyuriRmg: 'kyuri-rmg',
  newProjectConfirm: 'new-project-confirm',
  overwriteStations: 'overwrite-stations',
  settings: 'settings',
  stationForm: 'station-form',
  yamlImportConfirm: 'yaml-import-confirm',
  yamlImportError: 'yaml-import-error',
} as const;

export type OverlayId = (typeof OVERLAY_IDS)[keyof typeof OVERLAY_IDS];
