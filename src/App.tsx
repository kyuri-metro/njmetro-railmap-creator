import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
  type ChangeEvent,
} from 'react';
import { usePreviewLoadingOverlay } from './hooks/usePreviewLoadingOverlay';
import { useLineThemePalette } from './hooks/useLineThemePalette';
import { useGeneratorControlDrafts } from './hooks/useGeneratorControlDrafts';
import { useThemeMode } from './hooks/useThemeMode';
import { AppConfirmOverlays } from './components/AppConfirmOverlays';
import { AppTopbar } from './components/AppTopbar';
import { PreviewResultsPane } from './components/PreviewResultsPane';
import { StationFormModal, stationToDraft, type StationFormDraft } from './components/StationFormModal';
import { StationTable } from './components/StationTable';
import { KyuriRmgToolModal } from './components/KyuriRmgToolModal';
import { KyuriMetroStudioToolModal } from './components/KyuriMetroStudioToolModal';
import { AboutDialog } from './components/AboutDialog';
import { AutosaveListDialog } from './components/AutosaveListDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { KYURI_RMG_IFRAME_ORIGIN } from './config/kyuriRmgIframe';
import { KYURI_METRO_STUDIO_IFRAME_ORIGIN } from './config/kyuriMetroStudioIframe';
import { getBuiltinOpenedStationsByLineId } from './builtinOpenedLineStations';
import { getBuiltinJianbanStationsByLineId } from './builtinJianbanLineStations';
import { FillStationsByLineMenu, type BuiltinStationNetwork } from './components/FillStationsByLineMenu';
import type { AutosaveEntry } from './autosaveStorage';
import { markAutosaveDirty } from './features/autosaveScheduler';
import { markSavedExempt, shouldWarnOnLeave } from './features/leaveGuard';
import { builtinLineToGeneratorState, railmapImportToGeneratorState } from './features/generatorImport';
import {
  deleteStation,
  getEmptyGeneratorState,
  insertStation,
  restoreGeneratorState,
  reverseStnList,
  setCurrentStation,
  setDirection,
  setShowStationTypeIcons,
  updateStation,
  type GeneratorState,
  type StationItem,
  type TransferLine,
} from './features/generatorSlice';
import { FontDetectionHubTiles } from './components/FontDetectionHubTiles';
import { detectTargetFonts, targetFontSignatures, type FontDetectionResult } from './fontSignature';
import { getNjmetroLineForegroundColor } from './njmetroLinePalette';
import { parseRailmapYaml, serializeRailmapYaml, type RailmapYamlImport } from './stationListYaml';
import { useAppDispatch, useAppSelector, selectCanRedo, selectCanUndo, selectGeneratorPresent } from './hooks';
import { store, UndoActionCreators } from './store';

type ModalState =
  | {
      kind: 'create';
      stationId: string;
      position: 'before' | 'after' | 'start' | 'end';
      basisId?: string;
    }
  | {
      kind: 'edit';
      station: StationItem;
    }
  | null;

const docsReferenceUrl = 'https://github.com/kyuri-metro/njmetro-railmap-creator/tree/main/docs';
const fallbackFontDetectionResults: FontDetectionResult[] = Object.entries(targetFontSignatures).map(([fontFamily, expectedWidths]) => ({
  fontFamily: fontFamily as FontDetectionResult['fontFamily'],
  widths: null,
  expectedWidths,
  detected: false,
}));
const sanitizeTransfer = (value: TransferLine[]): TransferLine[] =>
  value
    .map((entry) => {
      const id = entry.id.trim();
      const color = /^#[0-9a-fA-F]{6}$/.test(entry.color) ? entry.color.toLowerCase() : '#8c989f';
      const textFromEntry = entry.textColor && /^#[0-9a-fA-F]{6}$/.test(entry.textColor) ? entry.textColor.toLowerCase() : null;
      const textColor = textFromEntry ?? getNjmetroLineForegroundColor(id) ?? '#ffffff';
      return { id, color, textColor };
    })
    .filter((entry) => entry.id.length > 0);

const toStationItem = (draft: StationFormDraft, id: string): StationItem => ({
  id,
  chName: draft.chName.trim(),
  enName: draft.enName.trim(),
  type: draft.type,
  transfer: sanitizeTransfer(draft.transfer),
});

const SunIcon = () => (
  <svg className="app-theme-icon" viewBox="0 0 24 24" aria-hidden>
    <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      d="M12 2v2m0 14v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m14 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
    />
  </svg>
);

const UndoIcon = () => (
  <svg className="app-topbar-action-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
    />
  </svg>
);

const RedoIcon = () => (
  <svg className="app-topbar-action-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m15 9 6 6m0 0-6 6M21 15H9a6 6 0 0 1 0-12h3"
    />
  </svg>
);

const MoreIcon = () => (
  <svg className="app-topbar-action-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <circle cx="5" cy="12" r="1.75" fill="currentColor" />
    <circle cx="12" cy="12" r="1.75" fill="currentColor" />
    <circle cx="19" cy="12" r="1.75" fill="currentColor" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="app-topbar-action-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
    />
  </svg>
);

const MoonIcon = () => (
  <svg className="app-theme-icon" viewBox="0 0 24 24" aria-hidden>
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
    />
  </svg>
);

function App() {
  const dispatch = useAppDispatch();
  const generator = useAppSelector(selectGeneratorPresent);
  useLineThemePalette(generator.idColor);
  const canUndo = useAppSelector(selectCanUndo);
  const canRedo = useAppSelector(selectCanRedo);
  const previewGenerator = useDeferredValue(generator);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [stationModalVisible, setStationModalVisible] = useState(false);
  const previewLoading = usePreviewLoadingOverlay(generator, 16);
  const {
    totalLength: totalLengthField,
    lineId: lineIdField,
    idColor: idColorField,
    idTextColor: idTextColorField,
    syncFromGenerator: syncControlDraftsFromGenerator,
  } = useGeneratorControlDrafts(generator);
  const { themeMode, toggleTheme } = useThemeMode();
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTopbarMoreMenuOpen, setIsTopbarMoreMenuOpen] = useState(false);
  const [isAutosaveListOpen, setIsAutosaveListOpen] = useState(false);
  const [isAutosaveRestoreConfirmOpen, setIsAutosaveRestoreConfirmOpen] = useState(false);
  const [pendingAutosaveEntry, setPendingAutosaveEntry] = useState<AutosaveEntry | null>(null);
  const [isExampleModalOpen, setIsExampleModalOpen] = useState(false);
  const [isOverwriteStationsConfirmOpen, setIsOverwriteStationsConfirmOpen] = useState(false);
  const [pendingBuiltinFill, setPendingBuiltinFill] = useState<{ network: BuiltinStationNetwork; lineId: string } | null>(null);
  const [isNewProjectConfirmOpen, setIsNewProjectConfirmOpen] = useState(false);
  const [isYamlImportConfirmOpen, setIsYamlImportConfirmOpen] = useState(false);
  const [pendingRailmapImport, setPendingRailmapImport] = useState<RailmapYamlImport | null>(null);
  const [yamlImportError, setYamlImportError] = useState<string | null>(null);
  const [kyuriRmgModal, setKyuriRmgModal] = useState<null | { mode: 'import' | 'export' }>(null);
  const [kyuriRmgOpen, setKyuriRmgOpen] = useState(false);
  const [kyuriMetroStudioOpen, setKyuriMetroStudioOpen] = useState(false);
  const [fontDetectionResults, setFontDetectionResults] = useState<FontDetectionResult[]>(fallbackFontDetectionResults);
  const [fontDetectionState, setFontDetectionState] = useState<'idle' | 'checking' | 'done'>('idle');

  const applyUndo = () => {
    dispatch(UndoActionCreators.undo());
    markAutosaveDirty();
    queueMicrotask(() => syncControlDraftsFromGenerator(store.getState().generator.present));
  };

  const applyRedo = () => {
    dispatch(UndoActionCreators.redo());
    markAutosaveDirty();
    queueMicrotask(() => syncControlDraftsFromGenerator(store.getState().generator.present));
  };

  const dismissAutosaveRestoreConfirm = () => {
    setIsAutosaveRestoreConfirmOpen(false);
    setPendingAutosaveEntry(null);
  };

  useEffect(() => {
    let cancelled = false;

    setFontDetectionState('checking');

    void (async () => {
      const nextResults = await detectTargetFonts();

      if (cancelled) {
        return;
      }

      setFontDetectionResults(nextResults);
      setFontDetectionState('done');
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldWarnOnLeave(store.getState())) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;

      if (event.key === 'Escape') {
        if (isNewProjectConfirmOpen) {
          setIsNewProjectConfirmOpen(false);
          return;
        }

        if (isOverwriteStationsConfirmOpen) {
          setIsOverwriteStationsConfirmOpen(false);
          setPendingBuiltinFill(null);
          return;
        }

        if (isYamlImportConfirmOpen) {
          setIsYamlImportConfirmOpen(false);
          setPendingRailmapImport(null);
          return;
        }

        if (yamlImportError) {
          setYamlImportError(null);
          return;
        }

        return;
      }

      if (!(target instanceof HTMLElement)) {
        return;
      }

      const editingText =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable;

      if (editingText) {
        return;
      }

      const mod = event.ctrlKey || event.metaKey;

      if (!mod) {
        return;
      }

      if (event.key === 'z' && !event.shiftKey) {
        if (!canUndo) {
          return;
        }

        event.preventDefault();
        applyUndo();
        return;
      }

      if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
        if (!canRedo) {
          return;
        }

        event.preventDefault();
        applyRedo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    canRedo,
    canUndo,
    dispatch,
    isNewProjectConfirmOpen,
    isOverwriteStationsConfirmOpen,
    isYamlImportConfirmOpen,
    yamlImportError,
  ]);

  const openInsertModal = (position: 'before' | 'after' | 'start' | 'end') => {
    const nextId = `station-${crypto.randomUUID()}`;
    const basisId = position === 'before' || position === 'after' ? generator.currentStnId : undefined;

    dispatch(
      insertStation({
        position,
        basisId,
        station: toStationItem(stationToDraft(), nextId),
      }),
    );
    setModalState({
      kind: 'create',
      stationId: nextId,
      position,
      basisId,
    });
    setStationModalVisible(true);
  };

  const closeStationModal = () => {
    if (modalState?.kind === 'create') {
      const station = generator.stnList.find((item) => item.id === modalState.stationId);

      if (station && station.chName.trim() === '' && station.enName.trim() === '') {
        dispatch(deleteStation(modalState.stationId));
      }
    }

    setStationModalVisible(false);
  };

  const clearStationModal = () => {
    setModalState(null);
  };

  const handleStationDraftChange = (draft: StationFormDraft) => {
    if (modalState?.kind === 'edit') {
      dispatch(updateStation(toStationItem(draft, modalState.station.id)));
      return;
    }

    if (modalState?.kind === 'create') {
      dispatch(updateStation(toStationItem(draft, modalState.stationId)));
    }
  };

  const handleFillStationsByLineId = (network: BuiltinStationNetwork, lineId: string) => {
    setPendingBuiltinFill({ network, lineId });
    setIsOverwriteStationsConfirmOpen(true);
  };

  const handleExportStationYaml = () => {
    const yml = serializeRailmapYaml(generator);
    const blob = new Blob([yml], { type: 'text/yaml;charset=utf-8' });
    const objectUrl = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');

    downloadLink.href = objectUrl;
    downloadLink.download = 'railmap.yml';
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.URL.revokeObjectURL(objectUrl);
    markSavedExempt();
  };

  const applyYamlTextForImport = (text: string) => {
    const result = parseRailmapYaml(text, generator);

    if (!result.ok) {
      setYamlImportError(result.message);
      return;
    }

    setPendingRailmapImport(result.data);
    setIsYamlImportConfirmOpen(true);
  };

  const handleYamlFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const text = String(reader.result ?? '');
      applyYamlTextForImport(text);
    };

    reader.onerror = () => {
      setYamlImportError('读取文件失败。');
    };

    reader.readAsText(file, 'UTF-8');
  };

  const confirmYamlStationImport = () => {
    if (!pendingRailmapImport) {
      return;
    }

    setIsYamlImportConfirmOpen(false);
    setPendingRailmapImport(null);

    const nextState = railmapImportToGeneratorState(pendingRailmapImport, generator);
    syncControlDraftsFromGenerator(nextState);

    startTransition(() => {
      dispatch(restoreGeneratorState(nextState));
      dispatch(UndoActionCreators.clearHistory());
    });
  };

  const confirmBuiltinStationOverwrite = () => {
    setIsOverwriteStationsConfirmOpen(false);

    if (!pendingBuiltinFill) {
      return;
    }

    const { network, lineId } = pendingBuiltinFill;
    setPendingBuiltinFill(null);

    const builtinStations =
      network === 'opened'
        ? getBuiltinOpenedStationsByLineId(lineId)
        : getBuiltinJianbanStationsByLineId(lineId);

    if (!builtinStations) {
      return;
    }

    const nextState = builtinLineToGeneratorState(lineId, builtinStations, generator, network);
    syncControlDraftsFromGenerator(nextState);

    startTransition(() => {
      dispatch(restoreGeneratorState(nextState));
      dispatch(UndoActionCreators.clearHistory());
    });
  };

  const handleAutosaveEntrySelect = (entry: AutosaveEntry) => {
    setPendingAutosaveEntry(entry);
    setIsAutosaveRestoreConfirmOpen(true);
  };

  const confirmNewProject = () => {
    setIsNewProjectConfirmOpen(false);
    const nextState = getEmptyGeneratorState();
    syncControlDraftsFromGenerator(nextState);

    startTransition(() => {
      dispatch(restoreGeneratorState(nextState));
      dispatch(UndoActionCreators.clearHistory());
    });
  };

  const confirmAutosaveRestore = () => {
    if (!pendingAutosaveEntry) {
      return;
    }

    const result = parseRailmapYaml(pendingAutosaveEntry.yaml, generator);

    if (!result.ok) {
      dismissAutosaveRestoreConfirm();
      setYamlImportError(result.message);
      return;
    }

    const nextState = railmapImportToGeneratorState(result.data, generator);
    dismissAutosaveRestoreConfirm();
    setIsAutosaveListOpen(false);
    setIsSettingsOpen(false);
    syncControlDraftsFromGenerator(nextState);

    startTransition(() => {
      dispatch(restoreGeneratorState(nextState));
      dispatch(UndoActionCreators.clearHistory());
    });
  };

  const currentStation = generator.stnList.find((station) => station.id === generator.currentStnId);
  const missingTargetFonts = fontDetectionResults.filter((result) => !result.detected);

  return (
    <main className="app-layout">
      <AppTopbar
        canUndo={canUndo}
        canRedo={canRedo}
        themeMode={themeMode}
        isTopbarMoreMenuOpen={isTopbarMoreMenuOpen}
        onTopbarMoreMenuOpenChange={setIsTopbarMoreMenuOpen}
        onUndo={applyUndo}
        onRedo={applyRedo}
        onNew={() => setIsNewProjectConfirmOpen(true)}
        onDownloadYaml={handleExportStationYaml}
        onYamlFileChange={handleYamlFileChange}
        onOpenRmgImport={() => {
          setKyuriRmgModal({ mode: 'import' });
          setKyuriRmgOpen(true);
        }}
        onOpenMetroStudioImport={() => {
          setKyuriMetroStudioOpen(true);
        }}
        onOpenRmgExport={() => {
          setKyuriRmgModal({ mode: 'export' });
          setKyuriRmgOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onToggleTheme={toggleTheme}
      />

      <div className="app-main">
        <div className="app-columns">
          <div className="app-column app-column-main">
            <section className="app-content-intro" aria-label="项目说明">
              <p>
                本项目受到
                {' '}
                <a href="https://github.com/railmapgen/rmg" target="_blank" rel="noreferrer">
                  RMG
                </a>
                {' '}
                项目的<b>启发</b>，在此表示感谢。
              </p>
              <div className="inline-links" aria-label="外部链接">
                <a href="https://github.com/kyuri-metro/njmetro-railmap-creator" target="_blank" rel="noreferrer">
                  GitHub 仓库
                </a>
                <a href={docsReferenceUrl} target="_blank" rel="noreferrer">
                  参考资料（docs/）
                </a>
                <a href="https://umamichi.moe/tools/" target="_blank" rel="noreferrer">
                  更多工具
                </a>
                <button type="button" className="ghost-button example-trigger" onClick={() => setIsExampleModalOpen(true)}>
                  查看示例
                </button>
              </div>
            </section>

            <section className="panel">
              <h2 className="site-content-heading">待办事项</h2>
              <ul>
                <li>暂无</li>
              </ul>
            </section>

            <section className="panel">
              <h2 className="site-content-heading">字体检测</h2>
              <p className="panel-subtitle">
                通过浏览器测得的字形宽度检查目标字体是否存在，避免预览与导出在不同设备上静默回退。
              </p>
              <FontDetectionHubTiles results={fontDetectionResults} detectionState={fontDetectionState} />
            </section>

            <section className="panel">
              <h2 className="site-content-heading">生成设置</h2>
              <div className="form-scope form-grid generator-settings-grid">
                <label className="field-label">
                  <span>总长（px）</span>
                  <input
                    className="text-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    spellCheck={false}
                    value={totalLengthField.draft}
                    onChange={(event) => totalLengthField.onDraftChange(event.target.value)}
                    onBlur={totalLengthField.onBlur}
                  />
                </label>
                <label className="field-label">
                  <span>列车行进方向</span>
                  <select
                    className="select-input"
                    value={generator.direction}
                    onChange={(event) => {
                      startTransition(() => {
                        dispatch(setDirection(event.target.value as 'l' | 'r'));
                      });
                    }}
                  >
                    <option value="l">l</option>
                    <option value="r">r</option>
                  </select>
                </label>
                <label className="field-label">
                  <span>线路编号</span>
                  <input
                    className="text-input"
                    type="text"
                    value={lineIdField.draft}
                    onChange={(event) => lineIdField.onDraftChange(event.target.value)}
                    onBlur={lineIdField.onBlur}
                  />
                </label>
                <label className="field-label">
                  <span>线路标识色</span>
                  <input
                    type="color"
                    value={idColorField.draft}
                    onChange={(event) => idColorField.onDraftChange(event.target.value)}
                    onBlur={idColorField.onBlur}
                  />
                </label>
                <label className="field-label">
                  <span>线路编号字体色</span>
                  <input
                    type="color"
                    value={idTextColorField.draft}
                    onChange={(event) => idTextColorField.onDraftChange(event.target.value)}
                    onBlur={idTextColorField.onBlur}
                  />
                </label>
                <label className="field-label field-label-checkbox">
                  <input
                    type="checkbox"
                    checked={generator.showStationTypeIcons}
                    onChange={(event) => {
                      startTransition(() => {
                        dispatch(setShowStationTypeIcons(event.target.checked));
                      });
                    }}
                  />
                  <span>在火车站或机场站名前添加图标（测试）</span>
                </label>
              </div>
            </section>

            <section className="panel">
              <div className="station-list-heading">
                <h2 className="site-content-heading">站点列表</h2>
                <div className="station-list-heading-end">
                  <FillStationsByLineMenu onSelectLine={handleFillStationsByLineId} />
                </div>
              </div>

              <StationTable
                currentStnId={generator.currentStnId}
                stations={generator.stnList}
                onEdit={(station) => {
                  setModalState({ kind: 'edit', station });
                  setStationModalVisible(true);
                }}
                onInsert={openInsertModal}
                onReverseList={() => {
                  startTransition(() => {
                    dispatch(reverseStnList());
                  });
                }}
                onSelect={(stationId) => {
                  startTransition(() => {
                    dispatch(setCurrentStation(stationId));
                  });
                }}
              />

              <p className="panel-subtitle preview-live-hint">右侧预览随表单与站点列表实时更新。</p>
            </section>
          </div>

          <PreviewResultsPane previewGenerator={previewGenerator} previewLoading={previewLoading} />
        </div>
      </div>

      {modalState ? (
        <StationFormModal
          key={modalState.kind === 'edit' ? modalState.station.id : modalState.stationId}
          allowDelete={modalState.kind === 'edit'}
          initialValue={modalState.kind === 'edit' ? stationToDraft(modalState.station) : stationToDraft()}
          modeLabel={modalState.kind === 'edit' ? '编辑站点' : '新增站点'}
          open={stationModalVisible}
          onClose={closeStationModal}
          onExited={clearStationModal}
          onDelete={
            modalState.kind === 'edit'
              ? () => {
                  dispatch(deleteStation(modalState.station.id));
                  closeStationModal();
                }
              : undefined
          }
          onChange={handleStationDraftChange}
        />
      ) : null}

      {kyuriRmgModal ? (
        <KyuriRmgToolModal
          open={kyuriRmgOpen}
          mode={kyuriRmgModal.mode}
          baseUrl={KYURI_RMG_IFRAME_ORIGIN}
          kyuriYamlForExport={serializeRailmapYaml(generator)}
          onClose={() => setKyuriRmgOpen(false)}
          onExited={() => setKyuriRmgModal(null)}
          onImportedYaml={(yaml) => {
            applyYamlTextForImport(yaml);
            setKyuriRmgOpen(false);
          }}
        />
      ) : null}

      <KyuriMetroStudioToolModal
        open={kyuriMetroStudioOpen}
        baseUrl={KYURI_METRO_STUDIO_IFRAME_ORIGIN}
        onClose={() => setKyuriMetroStudioOpen(false)}
        onImportedYaml={(yaml) => {
          applyYamlTextForImport(yaml);
          setKyuriMetroStudioOpen(false);
        }}
      />

      <AppConfirmOverlays
        isNewProjectConfirmOpen={isNewProjectConfirmOpen}
        onDismissNewProject={() => setIsNewProjectConfirmOpen(false)}
        onConfirmNewProject={confirmNewProject}
        isYamlImportConfirmOpen={isYamlImportConfirmOpen}
        onDismissYamlImport={() => {
          setIsYamlImportConfirmOpen(false);
          setPendingRailmapImport(null);
        }}
        onConfirmYamlImport={confirmYamlStationImport}
        yamlImportError={yamlImportError}
        onDismissYamlError={() => setYamlImportError(null)}
        isOverwriteStationsConfirmOpen={isOverwriteStationsConfirmOpen}
        onDismissOverwriteStations={() => {
          setIsOverwriteStationsConfirmOpen(false);
          setPendingBuiltinFill(null);
        }}
        onConfirmOverwriteStations={confirmBuiltinStationOverwrite}
        isExampleModalOpen={isExampleModalOpen}
        onDismissExampleModal={() => setIsExampleModalOpen(false)}
        isAutosaveRestoreConfirmOpen={isAutosaveRestoreConfirmOpen}
        pendingAutosaveEntry={pendingAutosaveEntry}
        onDismissAutosaveRestore={dismissAutosaveRestoreConfirm}
        onConfirmAutosaveRestore={confirmAutosaveRestore}
      />

      <SettingsDialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenAutosaveList={() => setIsAutosaveListOpen(true)}
      />

      <AutosaveListDialog
        open={isAutosaveListOpen}
        onClose={() => setIsAutosaveListOpen(false)}
        onSelectEntry={handleAutosaveEntrySelect}
      />

      <AboutDialog open={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </main>
  );
}

export default App;
