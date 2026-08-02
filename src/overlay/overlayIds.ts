export const OVERLAY_IDS = {
  about: 'about',
  autosaveList: 'autosave-list',
  autosaveRestore: 'autosave-restore',
  badgeDownload: 'badge-download',
  exampleModal: 'example-modal',
  kyuriRmg: 'kyuri-rmg',
  kyuriMetroStudio: 'kyuri-metro-studio',
  newProjectConfirm: 'new-project-confirm',
  overwriteStations: 'overwrite-stations',
  settings: 'settings',
  topbarMoreMenu: 'topbar-more-menu',
  stationForm: 'station-form',
  undeterminedTrainTypeNotice: 'undetermined-train-type-notice',
  yamlImportConfirm: 'yaml-import-confirm',
  yamlImportError: 'yaml-import-error',
} as const;

export type OverlayId = (typeof OVERLAY_IDS)[keyof typeof OVERLAY_IDS];
