import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { FullscreenOverlay } from '@umamichi-ui/common-components/overlay';
import { BadgeDownloadTrigger } from './BadgeDownloadTrigger';

const MagnifyPreviewIcon = () => (
  <svg className="result-svg-zoom-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
    <circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
    <path fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M10 7.75v4.5M7.75 10h4.5" />
    <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M15 15l6 6" />
  </svg>
);

export type DownloadableBadgeCardProps = {
  title: string;
  fileName: string;
  children: ReactNode;
};

export const DownloadableBadgeCard = ({ title, fileName, children }: DownloadableBadgeCardProps) => {
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

      <FullscreenOverlay
        open={isSvgZoomOpen}
        overlayId={svgZoomOverlayId}
        onDismiss={closeSvgZoom}
        title={`预览：${title}`}
        titleId={svgZoomTitleId}
        size="page"
        fill
        closeAriaLabel="关闭预览"
        panelClassName="svg-preview-zoom-dialog"
        bodyClassName="svg-preview-zoom-overlay-body"
      >
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
      </FullscreenOverlay>
    </>
  );
};
