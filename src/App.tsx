import {
  startTransition,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { ConfirmDialogOverlay } from '@umamichi-ui/common-components/dialog';
import { usePreviewLoadingOverlay } from './hooks/usePreviewLoadingOverlay';
import { CurrentStationBadge } from './components/CurrentStationBadge';
import { DirectionBadge } from './components/DirectionBadge';
import { RouteBadge } from './components/RouteBadge';
import { StationFormModal, stationToDraft, type StationFormDraft } from './components/StationFormModal';
import { StationTable } from './components/StationTable';
import { KyuriRmgToolModal } from './components/KyuriRmgToolModal';
import { AboutDialog } from './components/AboutDialog';
import { AutosaveListDialog } from './components/AutosaveListDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { BadgeDownloadTrigger } from './components/BadgeDownloadTrigger';
import { InfoCircleIcon } from '@umamichi-ui/common-components/icons';
import { MobileActionSheet } from '@umamichi-ui/common-components/menu';
import { TopbarFileCommands, ExportIcon, ImportIcon, NewFileIcon } from './components/topbar/TopbarFileCommands';
import { KYURI_RMG_IFRAME_ORIGIN } from './config/kyuriRmgIframe';
import { getBuiltinOpenedStationsByLineId } from './builtinOpenedLineStations';
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
  setIdColor,
  setIdTextColor,
  setLineId,
  setShowStationTypeIcons,
  setTotalLength,
  updateStation,
  type GeneratorState,
  type StationItem,
  type TransferLine,
} from './features/generatorSlice';
import { detectTargetFonts, targetFontSignatures, type FontDetectionResult } from './fontSignature';
import { getNjmetroLineForegroundColor } from './njmetroLinePalette';
import { parseRailmapYaml, serializeRailmapYaml, type RailmapYamlImport } from './stationListYaml';
import { useAppDispatch, useAppSelector, selectCanRedo, selectCanUndo, selectGeneratorPresent } from './hooks';
import { topbarCompactMediaQuery } from './layout/topbarLayout';
import { OVERLAY_IDS } from './overlay/overlayIds';
import { SiteOverlayBackdrop } from '@umamichi-ui/common-components/overlay';
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

type ThemeMode = 'light' | 'dark';

const controlDebounceMs = 160;

const parseTotalLengthDraft = (raw: string) => {
  const trimmed = raw.trim();

  if (trimmed === '') {
    return 0;
  }

  const n = Math.trunc(Number(trimmed));

  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const normalizeLineIdDraft = (raw: string) => raw.trim().toUpperCase();

const normalizeIdColorDraft = (raw: string) => {
  const v = raw.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
    return v.toLowerCase();
  }

  return null;
};

const hexColorsEqual = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const themeStorageKey = 'site-theme';
const themeTransitionLockClassName = 'theme-transition-lock';
const docsReferenceUrl = 'https://github.com/kyuri-metro/njmetro-railmap-creator/tree/main/docs';
const builtinLineUnavailableMessage =
  '当前线路编号未内置已开通站点列表。支持：1、2、3、4、5、6、7、10、S1、S2、S3、S4、S6、S7、S8、S9。';
const fallbackFontDetectionResults: FontDetectionResult[] = Object.entries(targetFontSignatures).map(([fontFamily, expectedWidths]) => ({
  fontFamily: fontFamily as FontDetectionResult['fontFamily'],
  widths: null,
  expectedWidths,
  detected: false,
}));
const sampleImages = [
  {
    title: '终点站示例',
    description: '线路标识与 Terminus 贴纸',
    src: `${import.meta.env.BASE_URL}assets/terminus-badge.webp`,
  },
  {
    title: '方向贴纸示例',
    description: '往某站 / 下一站 组合样式',
    src: `${import.meta.env.BASE_URL}assets/direction-badge.webp`,
  },
  {
    title: '路线图示例',
    description: '含当前站、换乘与后续站点的线路图',
    src: `${import.meta.env.BASE_URL}assets/route-badge.webp`,
  },
] as const;

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

const MagnifyPreviewIcon = () => (
  <svg className="result-svg-zoom-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
    <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M10 7.75v4.5M7.75 10h4.5" />
    <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M15 15l6 6" />
  </svg>
);

type DownloadableBadgeCardProps = {
  title: string;
  fileName: string;
  children: ReactNode;
};

const DownloadableBadgeCard = ({ title, fileName, children }: DownloadableBadgeCardProps) => {
  const badgeContainerRef = useRef<HTMLDivElement | null>(null);
  const svgZoomBodyRef = useRef<HTMLDivElement | null>(null);
  const svgZoomScrollLeftRef = useRef<number | null>(null);
  const svgZoomTitleId = useId();
  const [isSvgZoomOpen, setIsSvgZoomOpen] = useState(false);
  const svgZoomOverlayId = `${useId().replace(/:/g, '')}-svg-preview`;
  const [svgZoomMarkup, setSvgZoomMarkup] = useState('');
  const [svgZoomPercent, setSvgZoomPercent] = useState(100);

  const setSvgZoomPercentAnchored = (nextPercent: number) => {
    const body = svgZoomBodyRef.current;

    if (body && nextPercent !== svgZoomPercent) {
      const ratio = nextPercent / svgZoomPercent;
      const viewportCenterX = body.scrollLeft + body.clientWidth / 2;
      svgZoomScrollLeftRef.current = viewportCenterX * ratio - body.clientWidth / 2;
    }

    setSvgZoomPercent(nextPercent);
  };

  useLayoutEffect(() => {
    if (!isSvgZoomOpen) {
      return;
    }

    const body = svgZoomBodyRef.current;
    const nextScrollLeft = svgZoomScrollLeftRef.current;

    if (!body || nextScrollLeft === null) {
      return;
    }

    body.scrollLeft = nextScrollLeft;
    svgZoomScrollLeftRef.current = null;
  }, [isSvgZoomOpen, svgZoomPercent]);

  const getBadgeSvgElement = () => {
    const candidate = badgeContainerRef.current?.querySelector('svg');

    return candidate instanceof SVGSVGElement ? candidate : null;
  };

  const openSvgZoom = () => {
    const svgElement = badgeContainerRef.current?.querySelector('svg');

    if (!svgElement) {
      return;
    }

    const serializer = new XMLSerializer();
    setSvgZoomMarkup(serializer.serializeToString(svgElement));
    svgZoomScrollLeftRef.current = 0;
    setSvgZoomPercent(100);
    setIsSvgZoomOpen(true);
  };

  const closeSvgZoom = () => {
    setIsSvgZoomOpen(false);
  };

  return (
    <>
      <div className="result-block">
        <div className="result-block-heading">
          <h3>{title}</h3>
          <div className="result-actions">
            <BadgeDownloadTrigger fileName={fileName} getSvgElement={getBadgeSvgElement} />
            <button
              type="button"
              className="icon-button result-svg-zoom-trigger"
              aria-label={`查看 ${title} 大图`}
              onClick={openSvgZoom}
            >
              <MagnifyPreviewIcon />
            </button>
          </div>
        </div>
        <div ref={badgeContainerRef} className="badge-preview">
          {children}
        </div>
      </div>

      <SiteOverlayBackdrop
        open={isSvgZoomOpen}
        overlayId={svgZoomOverlayId}
        align="top"
        onDismiss={closeSvgZoom}
      >
        <section
          className="site-overlay-panel svg-preview-zoom-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby={svgZoomTitleId}
          onClick={(event) => event.stopPropagation()}
        >
                <header className="svg-preview-zoom-header">
                  <h2 id={svgZoomTitleId} className="svg-preview-zoom-title">
                    预览：{title}
                  </h2>
                  <button type="button" className="icon-button" aria-label="关闭预览" onClick={closeSvgZoom}>
                    ×
                  </button>
                </header>
                <div className="svg-preview-zoom-toolbar form-scope">
                  <label className="svg-preview-zoom-scale-label">
                    <span>缩放</span>
                    <input
                      type="range"
                      className="svg-preview-zoom-range"
                      min={100}
                      max={500}
                      step={1}
                      value={svgZoomPercent}
                      onChange={(event) => setSvgZoomPercentAnchored(Number(event.target.value))}
                    />
                    <span className="svg-preview-zoom-scale-value">{svgZoomPercent}%</span>
                  </label>
                  <BadgeDownloadTrigger
                    fileName={fileName}
                    getSvgElement={getBadgeSvgElement}
                    triggerClassName="svg-preview-zoom-download"
                  />
                </div>
                <div ref={svgZoomBodyRef} className="svg-preview-zoom-body">
                  <div className="svg-preview-zoom-scaled" style={{ width: `${svgZoomPercent}%` }}>
                    <div dangerouslySetInnerHTML={{ __html: svgZoomMarkup }} />
                  </div>
                </div>
              </section>
      </SiteOverlayBackdrop>
    </>
  );
};

function App() {
  const dispatch = useAppDispatch();
  const generator = useAppSelector(selectGeneratorPresent);
  const canUndo = useAppSelector(selectCanUndo);
  const canRedo = useAppSelector(selectCanRedo);
  const previewGenerator = useDeferredValue(generator);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [stationModalVisible, setStationModalVisible] = useState(false);
  const previewLoading = usePreviewLoadingOverlay(generator, 16);
  const [totalLengthDraft, setTotalLengthDraft] = useState(() => String(generator.totalLength));
  const totalLengthDraftRef = useRef(totalLengthDraft);
  const totalLengthDirtyRef = useRef(false);
  const totalLengthDebounceRef = useRef(0);
  const [lineIdDraft, setLineIdDraft] = useState(() => generator.lineId);
  const lineIdDraftRef = useRef(lineIdDraft);
  const lineIdDirtyRef = useRef(false);
  const lineIdDebounceRef = useRef(0);
  const [idColorDraft, setIdColorDraft] = useState(() => generator.idColor);
  const idColorDraftRef = useRef(idColorDraft);
  const idColorDirtyRef = useRef(false);
  const idColorDebounceRef = useRef(0);
  const [idTextColorDraft, setIdTextColorDraft] = useState(() => generator.idTextColor);
  const idTextColorDraftRef = useRef(idTextColorDraft);
  const idTextColorDirtyRef = useRef(false);
  const idTextColorDebounceRef = useRef(0);
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTopbarMoreMenuOpen, setIsTopbarMoreMenuOpen] = useState(false);
  const [isAutosaveListOpen, setIsAutosaveListOpen] = useState(false);
  const [isAutosaveRestoreConfirmOpen, setIsAutosaveRestoreConfirmOpen] = useState(false);
  const [pendingAutosaveEntry, setPendingAutosaveEntry] = useState<AutosaveEntry | null>(null);
  const [isExampleModalOpen, setIsExampleModalOpen] = useState(false);
  const [isOverwriteStationsConfirmOpen, setIsOverwriteStationsConfirmOpen] = useState(false);
  const [isNewProjectConfirmOpen, setIsNewProjectConfirmOpen] = useState(false);
  const [isYamlImportConfirmOpen, setIsYamlImportConfirmOpen] = useState(false);
  const [pendingRailmapImport, setPendingRailmapImport] = useState<RailmapYamlImport | null>(null);
  const [yamlImportError, setYamlImportError] = useState<string | null>(null);
  const [kyuriRmgModal, setKyuriRmgModal] = useState<null | { mode: 'import' | 'export' }>(null);
  const [kyuriRmgOpen, setKyuriRmgOpen] = useState(false);
  const yamlFileInputRef = useRef<HTMLInputElement>(null);
  const [builtinUnavailableNotice, setBuiltinUnavailableNotice] = useState<string | null>(null);
  const [fontDetectionResults, setFontDetectionResults] = useState<FontDetectionResult[]>(fallbackFontDetectionResults);
  const [fontDetectionState, setFontDetectionState] = useState<'idle' | 'checking' | 'done'>('idle');

  const syncControlDraftsFromGenerator = (state: GeneratorState) => {
    totalLengthDirtyRef.current = false;
    lineIdDirtyRef.current = false;
    idColorDirtyRef.current = false;
    idTextColorDirtyRef.current = false;
    setTotalLengthDraft(String(state.totalLength));
    setLineIdDraft(state.lineId);
    setIdColorDraft(state.idColor);
    setIdTextColorDraft(state.idTextColor);
  };

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
    const initialThemeMode = getInitialThemeMode();
    setThemeMode(initialThemeMode);
    applyThemeMode(initialThemeMode);
  }, []);

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
    const mq = window.matchMedia(topbarCompactMediaQuery);

    const onLayoutChange = () => {
      if (!mq.matches) {
        setIsTopbarMoreMenuOpen(false);
      }
    };

    onLayoutChange();
    mq.addEventListener('change', onLayoutChange);
    return () => mq.removeEventListener('change', onLayoutChange);
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

        if (builtinUnavailableNotice) {
          setBuiltinUnavailableNotice(null);
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
    builtinUnavailableNotice,
    yamlImportError,
  ]);

  totalLengthDraftRef.current = totalLengthDraft;
  lineIdDraftRef.current = lineIdDraft;
  idColorDraftRef.current = idColorDraft;
  idTextColorDraftRef.current = idTextColorDraft;

  useEffect(() => {
    if (!totalLengthDirtyRef.current) {
      setTotalLengthDraft(String(generator.totalLength));
    }
  }, [generator.totalLength]);

  useEffect(() => {
    if (!lineIdDirtyRef.current) {
      setLineIdDraft(generator.lineId);
    }
  }, [generator.lineId]);

  useEffect(() => {
    if (!idColorDirtyRef.current) {
      setIdColorDraft(generator.idColor);
    }
  }, [generator.idColor]);

  useEffect(() => {
    if (!idTextColorDirtyRef.current) {
      setIdTextColorDraft(generator.idTextColor);
    }
  }, [generator.idTextColor]);

  useEffect(() => {
    window.clearTimeout(totalLengthDebounceRef.current);
    totalLengthDebounceRef.current = window.setTimeout(() => {
      const parsed = parseTotalLengthDraft(totalLengthDraftRef.current);

      if (parsed !== generator.totalLength) {
        startTransition(() => {
          dispatch(setTotalLength(parsed));
        });
      }

      totalLengthDirtyRef.current = false;
      setTotalLengthDraft(String(parsed));
    }, controlDebounceMs);

    return () => {
      window.clearTimeout(totalLengthDebounceRef.current);
    };
  }, [totalLengthDraft, generator.totalLength, dispatch]);

  useEffect(() => {
    window.clearTimeout(lineIdDebounceRef.current);
    lineIdDebounceRef.current = window.setTimeout(() => {
      const next = normalizeLineIdDraft(lineIdDraftRef.current);

      if (next !== generator.lineId) {
        startTransition(() => {
          dispatch(setLineId(next));
        });
      }

      lineIdDirtyRef.current = false;
      setLineIdDraft(next);
    }, controlDebounceMs);

    return () => {
      window.clearTimeout(lineIdDebounceRef.current);
    };
  }, [lineIdDraft, generator.lineId, dispatch]);

  useEffect(() => {
    window.clearTimeout(idColorDebounceRef.current);
    idColorDebounceRef.current = window.setTimeout(() => {
      const next = normalizeIdColorDraft(idColorDraftRef.current);

      if (next !== null && !hexColorsEqual(next, generator.idColor)) {
        startTransition(() => {
          dispatch(setIdColor(next));
        });
      }

      idColorDirtyRef.current = false;

      if (next !== null) {
        setIdColorDraft(next);
      } else {
        setIdColorDraft(generator.idColor);
      }
    }, controlDebounceMs);

    return () => {
      window.clearTimeout(idColorDebounceRef.current);
    };
  }, [idColorDraft, generator.idColor, dispatch]);

  useEffect(() => {
    window.clearTimeout(idTextColorDebounceRef.current);
    idTextColorDebounceRef.current = window.setTimeout(() => {
      const next = normalizeIdColorDraft(idTextColorDraftRef.current);

      if (next !== null && !hexColorsEqual(next, generator.idTextColor)) {
        startTransition(() => {
          dispatch(setIdTextColor(next));
        });
      }

      idTextColorDirtyRef.current = false;

      if (next !== null) {
        setIdTextColorDraft(next);
      } else {
        setIdTextColorDraft(generator.idTextColor);
      }
    }, controlDebounceMs);

    return () => {
      window.clearTimeout(idTextColorDebounceRef.current);
    };
  }, [idTextColorDraft, generator.idTextColor, dispatch]);

  const flushTotalLengthDraft = () => {
    window.clearTimeout(totalLengthDebounceRef.current);
    const parsed = parseTotalLengthDraft(totalLengthDraftRef.current);

    if (parsed !== generator.totalLength) {
      startTransition(() => {
        dispatch(setTotalLength(parsed));
      });
    }

    totalLengthDirtyRef.current = false;
    setTotalLengthDraft(String(parsed));
  };

  const flushLineIdDraft = () => {
    window.clearTimeout(lineIdDebounceRef.current);
    const next = normalizeLineIdDraft(lineIdDraftRef.current);

    if (next !== generator.lineId) {
      startTransition(() => {
        dispatch(setLineId(next));
      });
    }

    lineIdDirtyRef.current = false;
    setLineIdDraft(next);
  };

  const flushIdColorDraft = () => {
    window.clearTimeout(idColorDebounceRef.current);
    const next = normalizeIdColorDraft(idColorDraftRef.current);

    if (next !== null && !hexColorsEqual(next, generator.idColor)) {
      startTransition(() => {
        dispatch(setIdColor(next));
      });
    }

    idColorDirtyRef.current = false;

    if (next !== null) {
      setIdColorDraft(next);
    } else {
      setIdColorDraft(generator.idColor);
    }
  };

  const flushIdTextColorDraft = () => {
    window.clearTimeout(idTextColorDebounceRef.current);
    const next = normalizeIdColorDraft(idTextColorDraftRef.current);

    if (next !== null && !hexColorsEqual(next, generator.idTextColor)) {
      startTransition(() => {
        dispatch(setIdTextColor(next));
      });
    }

    idTextColorDirtyRef.current = false;

    if (next !== null) {
      setIdTextColorDraft(next);
    } else {
      setIdTextColorDraft(generator.idTextColor);
    }
  };

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

  const handleThemeToggle = () => {
    const nextThemeMode: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextThemeMode);
    window.localStorage.setItem(themeStorageKey, nextThemeMode);
    applyThemeMode(nextThemeMode, true);
  };

  const handleFillStationsByLineId = () => {
    const targetLineId = normalizeLineIdDraft(lineIdDraftRef.current);

    if (!getBuiltinOpenedStationsByLineId(targetLineId)) {
      setBuiltinUnavailableNotice(builtinLineUnavailableMessage);
      return;
    }

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
    const targetLineId = normalizeLineIdDraft(lineIdDraftRef.current);
    const builtinStations = getBuiltinOpenedStationsByLineId(targetLineId);

    if (!builtinStations) {
      setBuiltinUnavailableNotice(builtinLineUnavailableMessage);
      return;
    }

    const nextState = builtinLineToGeneratorState(targetLineId, builtinStations, generator);
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
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <div className="app-topbar-title-wrap">
            <h1 className="app-topbar-title">
              <span className="app-topbar-title-text">南京地铁屏蔽门上方贴纸生成器</span>
              <span className="visually-hidden">（Beta 测试版）</span>
            </h1>
            <span className="app-topbar-beta-mark" aria-hidden="true">
              Beta
            </span>
          </div>
          <TopbarFileCommands
            yamlFileInputRef={yamlFileInputRef}
            rmgToolConfigured={Boolean(KYURI_RMG_IFRAME_ORIGIN)}
            onNew={() => setIsNewProjectConfirmOpen(true)}
            onDownloadYaml={handleExportStationYaml}
            onOpenRmgImport={() => {
              setKyuriRmgModal({ mode: 'import' });
              setKyuriRmgOpen(true);
            }}
            onOpenRmgExport={() => {
              setKyuriRmgModal({ mode: 'export' });
              setKyuriRmgOpen(true);
            }}
          />
          <div
            className="app-topbar-divider app-topbar-action--desktop-only"
            role="separator"
            aria-orientation="vertical"
            aria-hidden="true"
          />
          <input
            ref={yamlFileInputRef}
            type="file"
            accept=".yml,.yaml,text/yaml,application/yaml"
            className="visually-hidden"
            onChange={handleYamlFileChange}
          />
          <div className="app-topbar-actions">
            <button
              type="button"
              className="icon-button app-topbar-icon-button"
              aria-label="撤销"
              disabled={!canUndo}
              onClick={applyUndo}
            >
              <UndoIcon />
            </button>
            <button
              type="button"
              className="icon-button app-topbar-icon-button"
              aria-label="重做"
              disabled={!canRedo}
              onClick={applyRedo}
            >
              <RedoIcon />
            </button>
            <button
              type="button"
              className="icon-button app-topbar-icon-button app-topbar-action--desktop-only"
              aria-label="设置"
              onClick={() => setIsSettingsOpen(true)}
            >
              <SettingsIcon />
            </button>
            <button
              type="button"
              className="icon-button app-topbar-info-button app-topbar-action--desktop-only"
              aria-label="关于本生成器"
              onClick={() => setIsAboutOpen(true)}
            >
              <InfoCircleIcon />
            </button>
            <button
              className="theme-toggle app-topbar-theme-toggle"
              type="button"
              onClick={handleThemeToggle}
              aria-label={themeMode === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
            >
              {themeMode === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              type="button"
              className="icon-button app-topbar-icon-button app-topbar-action--mobile-only app-topbar-more-button"
              aria-label="更多"
              aria-haspopup="dialog"
              aria-expanded={isTopbarMoreMenuOpen}
              onClick={() => setIsTopbarMoreMenuOpen(true)}
            >
              <MoreIcon />
            </button>
          </div>
        </div>
      </header>

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
                <a href="https://umamichi.moe/" target="_blank" rel="noreferrer">
                  个人网站
                </a>
                <button type="button" className="ghost-button example-trigger" onClick={() => setIsExampleModalOpen(true)}>
                  查看示例
                </button>
              </div>
            </section>

            <section className="panel">
              <h2>待办事项</h2>
              <ul>
                <li>在火车站或机场是当前站时添加火车站或机场标识</li>
              </ul>
            </section>

            <section className="panel">
              <h2>字体检测</h2>
              <p className="panel-subtitle">
                通过浏览器测得的字形宽度检查目标字体是否存在，避免预览与导出在不同设备上静默回退。
              </p>
              {fontDetectionState === 'checking' && <p className="font-detection-summary">正在测量 Microsoft YaHei、FZHei-B01、Helvetica。</p>}
              <div className="font-detection-list" role="list" aria-label="字体检测结果">
                {fontDetectionResults.map((result) => (
                  <article key={result.fontFamily} className="font-detection-card" role="listitem">
                    <div className="font-detection-header">
                      <strong>{result.fontFamily}</strong>
                      <span className={`status-pill ${result.detected ? 'success' : fontDetectionState === 'checking' ? 'pending' : 'warning'}`}>
                        {fontDetectionState === 'checking' ? '检测中' : result.detected ? '已检测到' : '未检测到'}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel">
              <h2>生成设置</h2>
              <div className="form-scope form-grid generator-settings-grid">
                <label className="field-label">
                  <span>总长（px）</span>
                  <input
                    className="text-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    spellCheck={false}
                    value={totalLengthDraft}
                    onChange={(event) => {
                      totalLengthDirtyRef.current = true;
                      setTotalLengthDraft(event.target.value.replace(/\D/g, ''));
                    }}
                    onBlur={flushTotalLengthDraft}
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
                    value={lineIdDraft}
                    onChange={(event) => {
                      lineIdDirtyRef.current = true;
                      setLineIdDraft(event.target.value.trim().toUpperCase());
                    }}
                    onBlur={flushLineIdDraft}
                  />
                </label>
                <label className="field-label">
                  <span>线路标识色</span>
                  <input
                    type="color"
                    value={idColorDraft}
                    onChange={(event) => {
                      idColorDirtyRef.current = true;
                      setIdColorDraft(event.target.value);
                    }}
                    onBlur={flushIdColorDraft}
                  />
                </label>
                <label className="field-label">
                  <span>线路编号字体色</span>
                  <input
                    type="color"
                    value={idTextColorDraft}
                    onChange={(event) => {
                      idTextColorDirtyRef.current = true;
                      setIdTextColorDraft(event.target.value);
                    }}
                    onBlur={flushIdTextColorDraft}
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
                <h2>站点列表</h2>
                <div className="station-list-heading-end">
                  <button type="button" className="primary-button" onClick={handleFillStationsByLineId}>
                    按线路填充已开通站点
                  </button>
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

          <aside className="app-column app-column-preview" aria-label="结果预览">
            <div className="preview-column-root">
              {previewLoading ? (
                <div className="preview-loading-overlay" aria-live="polite" aria-busy="true">
                  <span className="preview-loading-label">加载中</span>
                </div>
              ) : null}
              <section className="panel result-panel">
                <h2>结果</h2>

                <DownloadableBadgeCard title="当前站吊板" fileName="current-station-badge.svg">
                  <CurrentStationBadge data={previewGenerator} />
                </DownloadableBadgeCard>

                <DownloadableBadgeCard title="方向吊板" fileName="direction-badge.svg">
                  <DirectionBadge data={previewGenerator} />
                </DownloadableBadgeCard>

                <DownloadableBadgeCard title="线路图吊板" fileName="route-badge.svg">
                  <RouteBadge data={previewGenerator} />
                </DownloadableBadgeCard>
              </section>
            </div>
          </aside>
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

      <ConfirmDialogOverlay
        open={isNewProjectConfirmOpen}
        overlayId={OVERLAY_IDS.newProjectConfirm}
        onDismiss={() => setIsNewProjectConfirmOpen(false)}
      >
        <div
          className="confirm-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-confirm-title"
          aria-describedby="new-project-confirm-desc"
        >
          <h2 id="new-project-confirm-title" className="confirm-dialog-title">
            确认新建
          </h2>
          <p id="new-project-confirm-desc" className="confirm-dialog-body">
            新建将创建空白线路图（无站点，保留默认线路编号与生成设置），覆盖当前编辑内容，并清空撤销历史，无法撤销至操作前。
          </p>
          <div className="confirm-dialog-actions">
            <button type="button" className="secondary-button" onClick={() => setIsNewProjectConfirmOpen(false)}>
              取消
            </button>
            <button type="button" className="primary-button" onClick={confirmNewProject}>
              新建
            </button>
          </div>
        </div>
      </ConfirmDialogOverlay>

      <ConfirmDialogOverlay
        open={isYamlImportConfirmOpen}
        overlayId={OVERLAY_IDS.yamlImportConfirm}
        onDismiss={() => {
          setIsYamlImportConfirmOpen(false);
          setPendingRailmapImport(null);
        }}
      >
        <div
          className="confirm-dialog"
          role="alertdialog"
            aria-modal="true"
            aria-labelledby="yaml-import-confirm-title"
            aria-describedby="yaml-import-confirm-desc"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="yaml-import-confirm-title" className="confirm-dialog-title">
              确认导入 YAML
            </h2>
            <p id="yaml-import-confirm-desc" className="confirm-dialog-body">
              导入将覆盖当前站点列表、线路编号、标识色、线路编号字体色与生成设置（总长、方向等），并清空撤销历史，无法撤销至导入前。
            </p>
            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setIsYamlImportConfirmOpen(false);
                  setPendingRailmapImport(null);
                }}
              >
                取消
              </button>
              <button type="button" className="primary-button" onClick={confirmYamlStationImport}>
                继续
              </button>
            </div>
        </div>
      </ConfirmDialogOverlay>

      <ConfirmDialogOverlay
        open={yamlImportError !== null}
        overlayId={OVERLAY_IDS.yamlImportError}
        onDismiss={() => setYamlImportError(null)}
      >
        {yamlImportError ? (
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="yaml-import-error-title"
            aria-describedby="yaml-import-error-desc"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="yaml-import-error-title" className="confirm-dialog-title">
              YAML 导入失败
            </h2>
            <p id="yaml-import-error-desc" className="confirm-dialog-body">
              {yamlImportError}
            </p>
            <div className="confirm-dialog-actions">
              <button type="button" className="primary-button" onClick={() => setYamlImportError(null)}>
                知道了
              </button>
            </div>
          </div>
        ) : null}
      </ConfirmDialogOverlay>

      <ConfirmDialogOverlay
        open={isOverwriteStationsConfirmOpen}
        overlayId={OVERLAY_IDS.overwriteStations}
        onDismiss={() => setIsOverwriteStationsConfirmOpen(false)}
      >
        <div
          className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="overwrite-stations-confirm-title"
            aria-describedby="overwrite-stations-confirm-desc"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="overwrite-stations-confirm-title" className="confirm-dialog-title">
              确认覆盖站点列表
            </h2>
            <p id="overwrite-stations-confirm-desc" className="confirm-dialog-body">
              此操作将会覆盖站点列表，并清空撤销历史，无法撤销至覆盖前。
            </p>
            <div className="confirm-dialog-actions">
              <button type="button" className="secondary-button" onClick={() => setIsOverwriteStationsConfirmOpen(false)}>
                取消
              </button>
              <button type="button" className="primary-button" onClick={confirmBuiltinStationOverwrite}>
                继续
              </button>
            </div>
        </div>
      </ConfirmDialogOverlay>

      <ConfirmDialogOverlay
        open={builtinUnavailableNotice !== null}
        overlayId={OVERLAY_IDS.builtinUnavailable}
        onDismiss={() => setBuiltinUnavailableNotice(null)}
      >
        {builtinUnavailableNotice ? (
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="builtin-unavailable-title"
            aria-describedby="builtin-unavailable-desc"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="builtin-unavailable-title" className="confirm-dialog-title">
              暂无内置站点列表
            </h2>
            <p id="builtin-unavailable-desc" className="confirm-dialog-body">
              {builtinUnavailableNotice}
            </p>
            <div className="confirm-dialog-actions">
              <button type="button" className="primary-button" onClick={() => setBuiltinUnavailableNotice(null)}>
                知道了
              </button>
            </div>
          </div>
        ) : null}
      </ConfirmDialogOverlay>

      <SiteOverlayBackdrop
        open={isExampleModalOpen}
        overlayId={OVERLAY_IDS.exampleModal}
        align="centered"
        onDismiss={() => setIsExampleModalOpen(false)}
      >
        <section
          className="example-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="example-modal-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="example-modal-header">
            <div>
              <h2 id="example-modal-title">参考样例</h2>
              <p className="panel-subtitle">以下图片来自 public/assets，仅用于版式参考，并非当前表单的实时输出。</p>
            </div>
            <button type="button" className="icon-button" aria-label="关闭示例浮窗" onClick={() => setIsExampleModalOpen(false)}>
              ×
            </button>
          </div>
          <div className="example-gallery">
            {sampleImages.map((sample) => (
              <figure key={sample.title} className="example-card">
                <img src={sample.src} alt={sample.title} loading="lazy" />
                <figcaption>
                  <strong>{sample.title}</strong>
                  <span>{sample.description}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      </SiteOverlayBackdrop>

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

      <ConfirmDialogOverlay
        open={isAutosaveRestoreConfirmOpen}
        overlayId={OVERLAY_IDS.autosaveRestore}
        onDismiss={dismissAutosaveRestoreConfirm}
      >
        <div
          className="confirm-dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="autosave-restore-confirm-title"
          aria-describedby="autosave-restore-confirm-desc"
          onClick={(event) => event.stopPropagation()}
        >
          <h2 id="autosave-restore-confirm-title" className="confirm-dialog-title">
            恢复自动保存
          </h2>
          <p id="autosave-restore-confirm-desc" className="confirm-dialog-body">
            {pendingAutosaveEntry
              ? `将用 ${pendingAutosaveEntry.summary}（${new Date(pendingAutosaveEntry.savedAt).toLocaleString('zh-CN')}）覆盖当前编辑内容，并清空撤销历史。`
              : ''}
          </p>
          <div className="confirm-dialog-actions">
            <button type="button" className="secondary-button" onClick={dismissAutosaveRestoreConfirm}>
              取消
            </button>
            <button type="button" className="primary-button" onClick={confirmAutosaveRestore}>
              继续
            </button>
          </div>
        </div>
      </ConfirmDialogOverlay>

      <MobileActionSheet
        open={isTopbarMoreMenuOpen}
        overlayId={OVERLAY_IDS.topbarMoreMenu}
        ariaLabel="顶栏更多"
        onDismiss={() => setIsTopbarMoreMenuOpen(false)}
        entries={[
          {
            kind: 'item',
            id: 'new',
            label: '新建',
            icon: <NewFileIcon />,
            onSelect: () => setIsNewProjectConfirmOpen(true),
          },
          {
            kind: 'submenu',
            id: 'import',
            label: '导入',
            icon: <ImportIcon />,
            items: [
              {
                kind: 'item',
                id: 'import-yaml',
                label: '从 YAML 文件导入…',
                onSelect: () => yamlFileInputRef.current?.click(),
              },
              {
                kind: 'item',
                id: 'import-rmg',
                label: '导入 RMG JSON 存档',
                disabled: !KYURI_RMG_IFRAME_ORIGIN,
                title: !KYURI_RMG_IFRAME_ORIGIN ? 'RMG 转换窗口未配置，无法使用此选项' : undefined,
                onSelect: () => {
                  setKyuriRmgModal({ mode: 'import' });
                  setKyuriRmgOpen(true);
                },
              },
            ],
          },
          {
            kind: 'submenu',
            id: 'export',
            label: '导出',
            icon: <ExportIcon />,
            items: [
              {
                kind: 'item',
                id: 'export-yaml',
                label: '下载 YAML',
                onSelect: handleExportStationYaml,
              },
              {
                kind: 'item',
                id: 'export-rmg',
                label: '导出 RMG JSON 存档',
                disabled: !KYURI_RMG_IFRAME_ORIGIN,
                title: !KYURI_RMG_IFRAME_ORIGIN ? 'RMG 转换窗口未配置，无法使用此选项' : undefined,
                onSelect: () => {
                  setKyuriRmgModal({ mode: 'export' });
                  setKyuriRmgOpen(true);
                },
              },
            ],
          },
          { kind: 'separator', id: 'topbar-file-separator' },
          {
            kind: 'item',
            id: 'settings',
            label: '设置',
            icon: <SettingsIcon />,
            onSelect: () => setIsSettingsOpen(true),
          },
          {
            kind: 'item',
            id: 'about',
            label: '关于',
            icon: <InfoCircleIcon />,
            onSelect: () => setIsAboutOpen(true),
          },
        ]}
      />

      <AboutDialog open={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </main>
  );
}

export default App;
