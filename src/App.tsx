import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
} from 'react';
import { usePreviewLoadingOverlay } from './hooks/usePreviewLoadingOverlay';
import { useLineThemePalette } from './hooks/useLineThemePalette';
import { useGeneratorControlDrafts } from './hooks/useGeneratorControlDrafts';
import { useGeneratorWorkspaceActions } from './hooks/useGeneratorWorkspaceActions';
import { useThemeMode } from './hooks/useThemeMode';
import { AppConfirmOverlays } from './components/AppConfirmOverlays';
import { AppTopbar } from './components/AppTopbar';
import { GeneratorSettingsPanel } from './components/GeneratorSettingsPanel';
import { PreviewResultsPane } from './components/PreviewResultsPane';
import { StationFormModal, stationToMetaDraft, type StationMetaDraft } from './components/StationFormModal';
import { StationTable } from './components/StationTable';
import { KyuriRmgToolModal } from './components/KyuriRmgToolModal';
import { KyuriMetroStudioToolModal } from './components/KyuriMetroStudioToolModal';
import { AboutDialog } from './components/AboutDialog';
import { AutosaveListDialog } from './components/AutosaveListDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { KYURI_RMG_IFRAME_ORIGIN } from './config/kyuriRmgIframe';
import { KYURI_METRO_STUDIO_IFRAME_ORIGIN } from './config/kyuriMetroStudioIframe';
import { FillStationsByLineMenu } from './components/FillStationsByLineMenu';
import { markAutosaveDirty } from './features/autosaveScheduler';
import { shouldWarnOnLeave } from './features/leaveGuard';
import {
  deleteStation,
  insertStation,
  reverseStnList,
  setCurrentStation,
  updateStation,
  type StationItem,
  type TransferLine,
} from './features/generatorSlice';
import { FontDetectionHubTiles } from './components/FontDetectionHubTiles';
import { detectTargetFonts, targetFontSignatures, type FontDetectionResult } from './fontSignature';
import { normalizeTransferLines } from './normalizeTransfer';
import { serializeRailmapYaml } from './stationListYaml';
import { useAppDispatch, useAppSelector, selectCanRedo, selectCanUndo, selectGeneratorPresent } from './hooks';
import { store, UndoActionCreators } from './store';

type ModalState = {
  station: StationItem;
} | null;

const docsReferenceUrl = 'https://github.com/kyuri-metro/njmetro-railmap-creator/tree/main/docs';
const fallbackFontDetectionResults: FontDetectionResult[] = Object.entries(targetFontSignatures).map(([fontFamily, expectedWidths]) => ({
  fontFamily: fontFamily as FontDetectionResult['fontFamily'],
  widths: null,
  expectedWidths,
  detected: false,
}));
const sanitizeTransfer = (value: TransferLine[]): TransferLine[] =>
  normalizeTransferLines(value, { fallbackColor: '#8c989f' });

const createEmptyStation = (id: string): StationItem => ({
  id,
  chName: '',
  enName: '',
  type: 'none',
  transfer: [],
});

type WorkspaceKeyboardContext = Pick<
  ReturnType<typeof useGeneratorWorkspaceActions>,
  | 'isNewProjectConfirmOpen'
  | 'isOverwriteStationsConfirmOpen'
  | 'isYamlImportConfirmOpen'
  | 'yamlImportError'
  | 'isUndeterminedTrainTypeNoticeOpen'
  | 'dismissNewProject'
  | 'dismissOverwriteStations'
  | 'dismissYamlImport'
  | 'dismissYamlError'
  | 'dismissUndeterminedTrainTypeNotice'
>;

const handleWorkspaceEscapeKey = (workspace: WorkspaceKeyboardContext) => {
  if (workspace.isNewProjectConfirmOpen) {
    workspace.dismissNewProject();
    return;
  }

  if (workspace.isOverwriteStationsConfirmOpen) {
    workspace.dismissOverwriteStations();
    return;
  }

  if (workspace.isYamlImportConfirmOpen) {
    workspace.dismissYamlImport();
    return;
  }

  if (workspace.yamlImportError) {
    workspace.dismissYamlError();
    return;
  }

  if (workspace.isUndeterminedTrainTypeNoticeOpen) {
    workspace.dismissUndeterminedTrainTypeNotice();
  }
};

const isEditingTextTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
};

const handleUndoRedoShortcut = (
  event: KeyboardEvent,
  canUndo: boolean,
  canRedo: boolean,
  applyUndo: () => void,
  applyRedo: () => void,
) => {
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

function App() {
  const dispatch = useAppDispatch();
  const generator = useAppSelector(selectGeneratorPresent);
  useLineThemePalette(generator.idColor);
  const canUndo = useAppSelector(selectCanUndo);
  const canRedo = useAppSelector(selectCanRedo);
  const previewGenerator = useDeferredValue(generator);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [stationModalVisible, setStationModalVisible] = useState(false);
  const [pendingDeleteStation, setPendingDeleteStation] = useState<StationItem | null>(null);
  const [focusChNameStationId, setFocusChNameStationId] = useState<string | null>(null);
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
  const [isExampleModalOpen, setIsExampleModalOpen] = useState(false);
  const [kyuriRmgModal, setKyuriRmgModal] = useState<null | { mode: 'import' | 'export' }>(null);
  const [kyuriRmgOpen, setKyuriRmgOpen] = useState(false);
  const [kyuriMetroStudioOpen, setKyuriMetroStudioOpen] = useState(false);
  const [fontDetectionResults, setFontDetectionResults] = useState<FontDetectionResult[]>(fallbackFontDetectionResults);
  const [fontDetectionState, setFontDetectionState] = useState<'idle' | 'checking' | 'done'>('idle');

  const workspace = useGeneratorWorkspaceActions({
    generator,
    syncControlDraftsFromGenerator,
    onAfterAutosaveRestore: () => {
      setIsAutosaveListOpen(false);
      setIsSettingsOpen(false);
    },
  });

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
      if (event.key === 'Escape') {
        handleWorkspaceEscapeKey(workspace);
        return;
      }

      if (isEditingTextTarget(event.target)) {
        return;
      }

      handleUndoRedoShortcut(event, canUndo, canRedo, applyUndo, applyRedo);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    canRedo,
    canUndo,
    workspace.isNewProjectConfirmOpen,
    workspace.isOverwriteStationsConfirmOpen,
    workspace.isYamlImportConfirmOpen,
    workspace.yamlImportError,
    workspace.isUndeterminedTrainTypeNoticeOpen,
    workspace.dismissNewProject,
    workspace.dismissOverwriteStations,
    workspace.dismissYamlImport,
    workspace.dismissYamlError,
    workspace.dismissUndeterminedTrainTypeNotice,
  ]);

  const insertStationRow = (position: 'before' | 'after' | 'start' | 'end', basisStationId?: string) => {
    const nextId = `station-${crypto.randomUUID()}`;
    const basisId =
      position === 'before' || position === 'after' ? (basisStationId ?? generator.currentStnId) : undefined;

    dispatch(
      insertStation({
        position,
        basisId,
        station: createEmptyStation(nextId),
      }),
    );
    setFocusChNameStationId(nextId);
  };

  const closeStationModal = () => {
    setStationModalVisible(false);
  };

  const clearStationModal = () => {
    setModalState(null);
  };

  const handleStationMetaChange = (draft: StationMetaDraft) => {
    if (!modalState) {
      return;
    }

    const live = generator.stnList.find((item) => item.id === modalState.station.id) ?? modalState.station;
    dispatch(
      updateStation({
        ...live,
        type: draft.type,
        transfer: sanitizeTransfer(draft.transfer),
      }),
    );
  };

  const handleCommitStationName = (stationId: string, field: 'chName' | 'enName', value: string) => {
    const live = generator.stnList.find((item) => item.id === stationId);
    if (!live || live[field] === value) {
      return;
    }

    dispatch(
      updateStation({
        ...live,
        [field]: value,
      }),
    );
  };

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
        onNew={() => workspace.setIsNewProjectConfirmOpen(true)}
        onDownloadYaml={workspace.handleExportStationYaml}
        onYamlFileChange={workspace.handleYamlFileChange}
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

            <GeneratorSettingsPanel
              generator={generator}
              totalLengthField={totalLengthField}
              lineIdField={lineIdField}
              idColorField={idColorField}
              idTextColorField={idTextColorField}
            />

            <section className="panel">
              <div className="station-list-heading">
                <h2 className="site-content-heading">站点列表</h2>
                <div className="station-list-heading-end">
                  <FillStationsByLineMenu onSelectLine={workspace.requestBuiltinStationOverwrite} />
                </div>
              </div>

              <StationTable
                currentStnId={generator.currentStnId}
                stations={generator.stnList}
                focusChNameStationId={focusChNameStationId}
                onFocusChNameHandled={() => setFocusChNameStationId(null)}
                onEdit={(station) => {
                  setModalState({ station });
                  setStationModalVisible(true);
                }}
                onInsert={insertStationRow}
                onInsertRelativeTo={(stationId, position) => {
                  insertStationRow(position, stationId);
                }}
                onRequestDelete={(station) => {
                  setPendingDeleteStation(station);
                }}
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
                onCommitName={handleCommitStationName}
              />

              <p className="panel-subtitle preview-live-hint">右侧预览随表单与站点列表实时更新。</p>
            </section>
          </div>

          <PreviewResultsPane previewGenerator={previewGenerator} previewLoading={previewLoading} />
        </div>
      </div>

      {modalState ? (
        <StationFormModal
          key={modalState.station.id}
          allowDelete
          initialValue={stationToMetaDraft(modalState.station)}
          modeLabel="编辑换乘与类型"
          open={stationModalVisible}
          onClose={closeStationModal}
          onExited={clearStationModal}
          onDelete={() => {
            dispatch(deleteStation(modalState.station.id));
            closeStationModal();
          }}
          onChange={handleStationMetaChange}
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
            workspace.applyYamlTextForImport(yaml);
            setKyuriRmgOpen(false);
          }}
        />
      ) : null}

      <KyuriMetroStudioToolModal
        open={kyuriMetroStudioOpen}
        baseUrl={KYURI_METRO_STUDIO_IFRAME_ORIGIN}
        onClose={() => setKyuriMetroStudioOpen(false)}
        onImportedYaml={(yaml) => {
          workspace.applyYamlTextForImport(yaml);
          setKyuriMetroStudioOpen(false);
        }}
      />

      <AppConfirmOverlays
        isNewProjectConfirmOpen={workspace.isNewProjectConfirmOpen}
        onDismissNewProject={workspace.dismissNewProject}
        onConfirmNewProject={workspace.confirmNewProject}
        isYamlImportConfirmOpen={workspace.isYamlImportConfirmOpen}
        onDismissYamlImport={workspace.dismissYamlImport}
        onConfirmYamlImport={workspace.confirmYamlStationImport}
        yamlImportError={workspace.yamlImportError}
        onDismissYamlError={workspace.dismissYamlError}
        isOverwriteStationsConfirmOpen={workspace.isOverwriteStationsConfirmOpen}
        onDismissOverwriteStations={workspace.dismissOverwriteStations}
        onConfirmOverwriteStations={workspace.confirmBuiltinStationOverwrite}
        isUndeterminedTrainTypeNoticeOpen={workspace.isUndeterminedTrainTypeNoticeOpen}
        onDismissUndeterminedTrainTypeNotice={workspace.dismissUndeterminedTrainTypeNotice}
        isExampleModalOpen={isExampleModalOpen}
        onDismissExampleModal={() => setIsExampleModalOpen(false)}
        isAutosaveRestoreConfirmOpen={workspace.isAutosaveRestoreConfirmOpen}
        pendingAutosaveEntry={workspace.pendingAutosaveEntry}
        onDismissAutosaveRestore={workspace.dismissAutosaveRestoreConfirm}
        onConfirmAutosaveRestore={workspace.confirmAutosaveRestore}
        pendingDeleteStation={pendingDeleteStation}
        onDismissDeleteStation={() => setPendingDeleteStation(null)}
        onConfirmDeleteStation={() => {
          if (!pendingDeleteStation) {
            return;
          }
          dispatch(deleteStation(pendingDeleteStation.id));
          setPendingDeleteStation(null);
        }}
      />

      <SettingsDialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenAutosaveList={() => setIsAutosaveListOpen(true)}
      />

      <AutosaveListDialog
        open={isAutosaveListOpen}
        onClose={() => setIsAutosaveListOpen(false)}
        onSelectEntry={workspace.handleAutosaveEntrySelect}
      />

      <AboutDialog open={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </main>
  );
}

export default App;
