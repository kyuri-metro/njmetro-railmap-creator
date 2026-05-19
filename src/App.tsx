import {
  startTransition,
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { ConfirmDialogOverlay } from './components/ConfirmDialogOverlay';
import { usePreviewLoadingOverlay } from './hooks/usePreviewLoadingOverlay';
import { useOverlayPresence, withOverlayOpen } from './hooks/useOverlayPresence';
import { CurrentStationBadge } from './components/CurrentStationBadge';
import { DirectionBadge } from './components/DirectionBadge';
import { RouteBadge } from './components/RouteBadge';
import { StationFormModal, stationToDraft, type StationFormDraft } from './components/StationFormModal';
import { StationTable } from './components/StationTable';
import { KyuriRmgToolModal } from './components/KyuriRmgToolModal';
import { AboutDialog } from './components/AboutDialog';
import { BadgeDownloadTrigger } from './components/BadgeDownloadTrigger';
import { InfoCircleIcon } from './components/InfoCircleIcon';
import { StationYamlExportMenu, StationYamlImportMenu } from './components/StationYamlIoMenus';
import { KYURI_RMG_IFRAME_ORIGIN } from './config/kyuriRmgIframe';
import { getBuiltinOpenedStationsByLineId } from './builtinOpenedLineStations';
import {
  deleteStation,
  insertStation,
  replaceStations,
  reverseStnList,
  setCurrentStation,
  setDirection,
  setIdColor,
  setIdTextColor,
  setLineId,
  setShowStationTypeIcons,
  setTotalLength,
  updateStation,
  type StationItem,
  type TransferLine,
} from './features/generatorSlice';
import { detectTargetFonts, targetFontSignatures, type FontDetectionResult } from './fontSignature';
import { getNjmetroLineForegroundColor } from './njmetroLinePalette';
import { parseRailmapYaml, serializeRailmapYaml, type RailmapYamlImport } from './stationListYaml';
import { useAppDispatch, useAppSelector } from './hooks';

type ModalState =
  | {
      kind: 'create';
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
  const svgZoomTitleId = useId();
  const [isSvgZoomOpen, setIsSvgZoomOpen] = useState(false);
  const { mounted: svgZoomMounted, isOpen: svgZoomOpen, overlayRef: svgZoomOverlayRef } =
    useOverlayPresence<HTMLDivElement>(isSvgZoomOpen);
  const [svgZoomMarkup, setSvgZoomMarkup] = useState('');
  const [svgZoomPercent, setSvgZoomPercent] = useState(100);

  useEffect(() => {
    if (!isSvgZoomOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSvgZoomOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSvgZoomOpen]);

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

      {svgZoomMounted
        ? createPortal(
            <div
              ref={svgZoomOverlayRef}
              className={withOverlayOpen('site-overlay-backdrop svg-preview-zoom-backdrop', svgZoomOpen)}
              role="presentation"
              onClick={closeSvgZoom}
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
                      onChange={(event) => setSvgZoomPercent(Number(event.target.value))}
                    />
                    <span className="svg-preview-zoom-scale-value">{svgZoomPercent}%</span>
                  </label>
                  <BadgeDownloadTrigger
                    fileName={fileName}
                    getSvgElement={getBadgeSvgElement}
                    triggerClassName="svg-preview-zoom-download"
                  />
                </div>
                <div className="svg-preview-zoom-body">
                  <div className="svg-preview-zoom-scaled" style={{ width: `${svgZoomPercent}%` }}>
                    <div dangerouslySetInnerHTML={{ __html: svgZoomMarkup }} />
                  </div>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
};

function App() {
  const dispatch = useAppDispatch();
  const generator = useAppSelector((state) => state.generator);
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
  const [isExampleModalOpen, setIsExampleModalOpen] = useState(false);
  const { mounted: exampleModalMounted, isOpen: exampleModalOpen, overlayRef: exampleModalOverlayRef } =
    useOverlayPresence<HTMLDivElement>(isExampleModalOpen);
  const [isOverwriteStationsConfirmOpen, setIsOverwriteStationsConfirmOpen] = useState(false);
  const [isYamlImportConfirmOpen, setIsYamlImportConfirmOpen] = useState(false);
  const [pendingRailmapImport, setPendingRailmapImport] = useState<RailmapYamlImport | null>(null);
  const [yamlImportError, setYamlImportError] = useState<string | null>(null);
  const [kyuriRmgModal, setKyuriRmgModal] = useState<null | { mode: 'import' | 'export' }>(null);
  const [kyuriRmgOpen, setKyuriRmgOpen] = useState(false);
  const yamlFileInputRef = useRef<HTMLInputElement>(null);
  const [builtinUnavailableNotice, setBuiltinUnavailableNotice] = useState<string | null>(null);
  const [fontDetectionResults, setFontDetectionResults] = useState<FontDetectionResult[]>(fallbackFontDetectionResults);
  const [fontDetectionState, setFontDetectionState] = useState<'idle' | 'checking' | 'done'>('idle');

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
    if (!isOverwriteStationsConfirmOpen && !builtinUnavailableNotice && !yamlImportError && !isYamlImportConfirmOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (isOverwriteStationsConfirmOpen) {
        setIsOverwriteStationsConfirmOpen(false);
      }

      if (isYamlImportConfirmOpen) {
        setIsYamlImportConfirmOpen(false);
        setPendingRailmapImport(null);
      }

      if (yamlImportError) {
        setYamlImportError(null);
      }

      if (builtinUnavailableNotice) {
        setBuiltinUnavailableNotice(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
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

      if (next !== null && next !== generator.idColor) {
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

      if (next !== null && next !== generator.idTextColor) {
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

    if (next !== null && next !== generator.idColor) {
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

    if (next !== null && next !== generator.idTextColor) {
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
    setModalState({
      kind: 'create',
      position,
      basisId: position === 'before' || position === 'after' ? generator.currentStnId : undefined,
    });
    setStationModalVisible(true);
  };

  const closeStationModal = () => {
    setStationModalVisible(false);
  };

  const clearStationModal = () => {
    setModalState(null);
  };

  const handleModalSubmit = (draft: StationFormDraft) => {
    if (modalState?.kind === 'edit') {
      dispatch(updateStation(toStationItem(draft, modalState.station.id)));
    }

    if (modalState?.kind === 'create') {
      const nextId = `station-${crypto.randomUUID()}`;
      dispatch(
        insertStation({
          position: modalState.position,
          basisId: modalState.basisId,
          station: toStationItem(draft, nextId),
        }),
      );
    }

    closeStationModal();
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

    const { stations, lineId, color, lineIdTextColor, njMetroSettings } = pendingRailmapImport;
    setIsYamlImportConfirmOpen(false);
    setPendingRailmapImport(null);

    totalLengthDirtyRef.current = false;
    lineIdDirtyRef.current = false;
    idColorDirtyRef.current = false;
    idTextColorDirtyRef.current = false;
    setTotalLengthDraft(String(njMetroSettings.totalLength));
    setLineIdDraft(lineId);
    setIdColorDraft(color);
    setIdTextColorDraft(lineIdTextColor);

    startTransition(() => {
      dispatch(replaceStations({ stations }));
      dispatch(setTotalLength(njMetroSettings.totalLength));
      dispatch(setDirection(njMetroSettings.direction));
      dispatch(setShowStationTypeIcons(njMetroSettings.showStationTypeIcons));
      dispatch(setLineId(lineId));
      dispatch(setIdColor(color));
      dispatch(setIdTextColor(lineIdTextColor));
      dispatch(setCurrentStation(njMetroSettings.currentStnId));
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

    startTransition(() => {
      if (targetLineId !== generator.lineId) {
        dispatch(setLineId(targetLineId));
      }

      dispatch(replaceStations({ stations: builtinStations }));
      dispatch(setCurrentStation(builtinStations[0]?.id ?? ''));
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
          <div className="app-topbar-actions">
            <button
              type="button"
              className="icon-button app-topbar-info-button"
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
                  <div className="station-list-yaml-tools" role="group" aria-label="站点列表 YAML">
                    <StationYamlExportMenu
                      rmgToolConfigured={Boolean(KYURI_RMG_IFRAME_ORIGIN)}
                      onDownloadYaml={handleExportStationYaml}
                      onOpenRmgExport={() => {
                        setKyuriRmgModal({ mode: 'export' });
                        setKyuriRmgOpen(true);
                      }}
                    />
                    <StationYamlImportMenu
                      yamlFileInputRef={yamlFileInputRef}
                      rmgToolConfigured={Boolean(KYURI_RMG_IFRAME_ORIGIN)}
                      onOpenRmgImport={() => {
                        setKyuriRmgModal({ mode: 'import' });
                        setKyuriRmgOpen(true);
                      }}
                    />
                    <input
                      ref={yamlFileInputRef}
                      type="file"
                      accept=".yml,.yaml,text/yaml,application/yaml"
                      className="visually-hidden"
                      onChange={handleYamlFileChange}
                    />
                  </div>
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
          onSubmit={handleModalSubmit}
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
        open={isYamlImportConfirmOpen}
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
              导入将覆盖当前站点列表、线路编号、标识色、线路编号字体色与生成设置（总长、方向等），且不可撤销。
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

      <ConfirmDialogOverlay open={yamlImportError !== null} onDismiss={() => setYamlImportError(null)}>
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
              此操作将会覆盖站点列表，这一操作不可撤销
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

      {exampleModalMounted
        ? createPortal(
            <div
              ref={exampleModalOverlayRef}
              className={withOverlayOpen('example-modal-backdrop', exampleModalOpen)}
              role="presentation"
              onClick={() => setIsExampleModalOpen(false)}
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
            </div>,
            document.body,
          )
        : null}

      <AboutDialog open={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </main>
  );
}

export default App;
