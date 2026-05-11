import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CurrentStationBadge } from './components/CurrentStationBadge';
import { DirectionBadge } from './components/DirectionBadge';
import { RouteBadge } from './components/RouteBadge';
import { StationFormModal, stationToDraft, type StationFormDraft } from './components/StationFormModal';
import { StationTable } from './components/StationTable';
import {
  deleteStation,
  insertStation,
  setCurrentStation,
  setDirection,
  setIdColor,
  setLineId,
  setShowStationTypeIcons,
  setTotalLength,
  updateStation,
  type GeneratorState,
  type StationItem,
  type TransferLine,
} from './features/generatorSlice';
import { detectTargetFonts, targetFontSignatures, type FontDetectionResult } from './fontSignature';
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

const themeStorageKey = 'site-theme';
const themeTransitionLockClassName = 'theme-transition-lock';
const svgExportComment = '<!-- created by njmetro-railmap-creator, (https://github.com/kyuri-metro/njmetro-railmap-creator) -->';
const docsReferenceUrl = 'https://github.com/kyuri-metro/njmetro-railmap-creator/tree/main/docs';
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
  rootElement.style.colorScheme = themeMode;

  if (disableTransitions) {
    scheduleThemeTransitionUnlock();
  }
};

const sanitizeTransfer = (value: TransferLine[]): TransferLine[] =>
  value
    .map((entry) => ({
      id: entry.id.trim(),
      color: /^#[0-9a-fA-F]{6}$/.test(entry.color) ? entry.color : '#8c989f',
    }))
    .filter((entry) => entry.id.length > 0);

const toStationItem = (draft: StationFormDraft, id: string): StationItem => ({
  id,
  chName: draft.chName.trim(),
  enName: draft.enName.trim(),
  type: draft.type,
  transfer: sanitizeTransfer(draft.transfer),
});

type DownloadableBadgeCardProps = {
  title: string;
  fileName: string;
  children: ReactNode;
};

const DownloadableBadgeCard = ({ title, fileName, children }: DownloadableBadgeCardProps) => {
  const badgeContainerRef = useRef<HTMLDivElement | null>(null);

  const handleDownload = () => {
    const svgElement = badgeContainerRef.current?.querySelector('svg');

    if (!svgElement) {
      return;
    }

    const serializer = new XMLSerializer();
    const svgMarkup = `${svgExportComment}\n${serializer.serializeToString(svgElement)}`;
    const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = window.URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');

    downloadLink.href = objectUrl;
    downloadLink.download = fileName;
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.URL.revokeObjectURL(objectUrl);
  };

  return (
    <div className="result-block">
      <h3>{title}</h3>
      <div ref={badgeContainerRef} className="badge-preview">
        {children}
      </div>
      <div className="result-actions">
        <button type="button" className="secondary-button" onClick={handleDownload}>
          下载 SVG
        </button>
      </div>
    </div>
  );
};

function App() {
  const dispatch = useAppDispatch();
  const generator = useAppSelector((state) => state.generator);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [submittedData, setSubmittedData] = useState<GeneratorState>(generator);
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [isExampleModalOpen, setIsExampleModalOpen] = useState(false);
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

  const openInsertModal = (position: 'before' | 'after' | 'start' | 'end') => {
    setModalState({
      kind: 'create',
      position,
      basisId: position === 'before' || position === 'after' ? generator.currentStnId : undefined,
    });
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

    setModalState(null);
  };

  const handleThemeToggle = () => {
    const nextThemeMode: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextThemeMode);
    window.localStorage.setItem(themeStorageKey, nextThemeMode);
    applyThemeMode(nextThemeMode, true);
  };

  const currentStation = generator.stnList.find((station) => station.id === generator.currentStnId);
  const missingTargetFonts = fontDetectionResults.filter((result) => !result.detected);

  return (
    <main className="page-shell">
      <header className="page-header">
        <div className="page-meta-row">
          <p className="eyebrow">Nanjing Metro Prototype</p>
          <button
            className="theme-toggle"
            type="button"
            onClick={handleThemeToggle}
            aria-label={themeMode === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          >
            {themeMode === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          </button>
        </div>
        <h1>南京地铁屏蔽门上方贴纸生成器（Alpha）</h1>
        <p className="lead">用于演示 SVG 输出骨架</p>
        <p>
          本项目受到
          {' '}
          <a href="https://github.com/railmapgen/rmg" target="_blank" rel="noreferrer">
            RMG
          </a>
          {' '}
          项目的启发，在此表示感谢。
        </p>
        <div className="docs-callout">
          <strong>参考资料与推导过程</strong>
          <p>
            参考资料、尺寸记录与推导过程见
            {' '}
            <a href={docsReferenceUrl} target="_blank" rel="noreferrer">
              docs/
            </a>
            。
          </p>
        </div>
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
      </header>

      <section className="panel">
        <h2>待办事项</h2>
        <ul>
          <li>在火车站或机场是当前站时添加火车站或机场标识</li>
        </ul>
      </section>

      <section className="panel">
        <h2>字体检测</h2>
        <p className="panel-subtitle">
          使用与旧项目相同的 Canvas 字形宽度签名检查目标字体是否存在，避免预览与导出在不同设备上静默回退。
        </p>
        <p className="font-detection-summary">
          {fontDetectionState === 'checking'
            ? '正在测量 Microsoft YaHei、FZHei-B01、Helvetica。'
            : missingTargetFonts.length === 0
              ? '三种目标字体均已检测到。'
              : `以下字体未通过签名校验：${missingTargetFonts.map((result) => result.fontFamily).join('、')}。`}
        </p>
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
        <div className="form-grid single-column">
          <label className="field-label">
            <span>totalLength（总长（px））</span>
            <input
              className="text-input"
              type="number"
              min={0}
              step={1}
              value={generator.totalLength}
              onChange={(event) => dispatch(setTotalLength(Number(event.target.value) || 0))}
            />
          </label>
          <label className="field-label">
            <span>direction（列车行进方向）</span>
            <select
              className="solver-select"
              value={generator.direction}
              onChange={(event) => dispatch(setDirection(event.target.value as 'l' | 'r'))}
            >
              <option value="l">l</option>
              <option value="r">r</option>
            </select>
          </label>
          <label className="field-label">
            <span>lineId（线路编号）</span>
            <input
              className="text-input"
              type="text"
              value={generator.lineId}
              onChange={(event) => dispatch(setLineId(event.target.value.trim().toUpperCase()))}
            />
            <span className="field-hint">若该编号在南京地铁线路调色板中有定义，将自动填入下方的线路标识色。</span>
          </label>
          <label className="field-label">
            <span>idColor（线路标识色）</span>
            <input type="color" value={generator.idColor} onChange={(event) => dispatch(setIdColor(event.target.value))} />
          </label>
          <label className="field-label field-label-checkbox">
            <input
              type="checkbox"
              checked={generator.showStationTypeIcons}
              onChange={(event) => dispatch(setShowStationTypeIcons(event.target.checked))}
            />
            <span>在火车站或机场站名前添加图标（测试）</span>
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>站点列表</h2>
          </div>
        </div>

        <StationTable
          currentStnId={generator.currentStnId}
          stations={generator.stnList}
          onEdit={(station) => setModalState({ kind: 'edit', station })}
          onInsert={openInsertModal}
          onSelect={(stationId) => dispatch(setCurrentStation(stationId))}
        />

        <br />

        <button type="button" className="primary-button submit-button" onClick={() => setSubmittedData(generator)}>
          提交
        </button>
      </section>

      <section className="panel result-panel">
        <h2>结果</h2>

        <DownloadableBadgeCard title="CurrentStationBadge" fileName="current-station-badge.svg">
          <CurrentStationBadge data={submittedData} />
        </DownloadableBadgeCard>

        <DownloadableBadgeCard title="DirectionBadge" fileName="direction-badge.svg">
          <DirectionBadge data={submittedData} />
        </DownloadableBadgeCard>

        <DownloadableBadgeCard title="RouteBadge" fileName="route-badge.svg">
          <RouteBadge data={submittedData} />
        </DownloadableBadgeCard>
      </section>

      {modalState ? (
        <StationFormModal
          allowDelete={modalState.kind === 'edit'}
          initialValue={modalState.kind === 'edit' ? stationToDraft(modalState.station) : stationToDraft()}
          modeLabel={modalState.kind === 'edit' ? '编辑站点' : '新增站点'}
          onClose={() => setModalState(null)}
          onDelete={
            modalState.kind === 'edit'
              ? () => {
                  dispatch(deleteStation(modalState.station.id));
                  setModalState(null);
                }
              : undefined
          }
          onSubmit={handleModalSubmit}
        />
      ) : null}

      {isExampleModalOpen ? (
        <div className="example-modal-backdrop" role="presentation" onClick={() => setIsExampleModalOpen(false)}>
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
        </div>
      ) : null}
    </main>
  );
}

export default App;
