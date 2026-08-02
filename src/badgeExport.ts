export const GENERATOR_PUBLIC_URL = 'https://njmetro-railmap-creator.umamichi.moe/';

export const PUBLISH_ATTRIBUTION_SNIPPET = `本图片由南京地铁屏蔽门吊板生成器（${GENERATOR_PUBLIC_URL}）生成`;

export const DOWNLOAD_WATERMARK_TEXT = `由南京地铁屏蔽门吊板生成器（${GENERATOR_PUBLIC_URL}）生成`;

const svgExportComment =
  '<!-- created by njmetro-railmap-creator, (https://github.com/kyuri-metro/njmetro-railmap-creator) -->';

const WATERMARK_OPACITY = 0.14;
const WATERMARK_FILL = `rgba(0, 0, 0, ${WATERMARK_OPACITY})`;
const WATERMARK_FONT_FAMILY = 'sans-serif';
export const getBadgeDownloadBaseName = (fileName: string) => fileName.replace(/\.svg$/i, '') || 'badge';

export const webpRasterExportSupported =
  typeof document !== 'undefined'
    ? (() => {
        try {
          const probe = document.createElement('canvas');
          probe.width = 1;
          probe.height = 1;
          return probe.toDataURL('image/webp').startsWith('data:image/webp');
        } catch {
          return false;
        }
      })()
    : false;

/** 单块光栅画布最大边长（适配 iOS 等环境的 canvas 面积/尺寸限制） */
const RASTER_EXPORT_TILE_MAX = 4096;

export const DEFAULT_EXPORT_HEIGHT = 800;

export const parseExportHeight = (raw: string) => {
  const trimmed = raw.trim();

  if (trimmed === '') {
    return DEFAULT_EXPORT_HEIGHT;
  }

  const n = Math.trunc(Number(trimmed));

  return Number.isFinite(n) && n >= 1 ? n : DEFAULT_EXPORT_HEIGHT;
};

const getExportDimensions = (svgElement: SVGSVGElement, exportHeight: number) => {
  const logical = getSvgExportPixelSize(svgElement);
  const pixelScale = exportHeight / logical.height;

  return {
    width: Math.round(logical.width * pixelScale),
    height: Math.round(exportHeight),
    pixelScale,
  };
};

const getSvgExportPixelSize = (svg: SVGSVGElement): { width: number; height: number } => {
  const viewBox = svg.getAttribute('viewBox');

  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).filter(Boolean);

    if (parts.length >= 4) {
      const w = Number.parseFloat(parts[2] ?? '');
      const h = Number.parseFloat(parts[3] ?? '');

      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        return { width: Math.round(w), height: Math.round(h) };
      }
    }
  }

  const widthAttr = svg.getAttribute('width');
  const heightAttr = svg.getAttribute('height');

  if (widthAttr && heightAttr) {
    const w = Number.parseFloat(widthAttr);
    const h = Number.parseFloat(heightAttr);

    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      return { width: Math.round(w), height: Math.round(h) };
    }
  }

  const rect = svg.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));

  return { width: w, height: h };
};

const getSvgViewBoxOrigin = (svg: SVGSVGElement): { x: number; y: number } => {
  const viewBox = svg.getAttribute('viewBox');

  if (viewBox) {
    const parts = viewBox.trim().split(/[\s,]+/).filter(Boolean);

    if (parts.length >= 2) {
      const x = Number.parseFloat(parts[0] ?? '0');
      const y = Number.parseFloat(parts[1] ?? '0');

      if (Number.isFinite(x) && Number.isFinite(y)) {
        return { x, y };
      }
    }
  }

  return { x: 0, y: 0 };
};

const prepareSvgExportClone = (svgElement: SVGSVGElement, width: number, height: number): SVGSVGElement => {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  if (!clone.getAttribute('xmlns:xlink')) {
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  }

  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  return clone;
};

const getWatermarkFontSize = (height: number) => Math.max(28, Math.round(height * 0.08));

const getWatermarkLayout = (width: number, height: number, textWidth: number, fontSize: number) => {
  const stepX = Math.max(textWidth + fontSize * 2, fontSize * 12);
  const stepY = Math.max(fontSize * 3.2, 48);

  return { stepX, stepY };
};

const drawRepeatingWatermark = (context: CanvasRenderingContext2D, width: number, height: number) => {
  const fontSize = getWatermarkFontSize(height);
  const font = `${fontSize}px ${WATERMARK_FONT_FAMILY}`;

  context.save();
  context.font = font;
  context.fillStyle = WATERMARK_FILL;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  const textWidth = context.measureText(DOWNLOAD_WATERMARK_TEXT).width;
  const { stepX, stepY } = getWatermarkLayout(width, height, textWidth, fontSize);

  for (let row = 0, y = stepY / 2; y < height + stepY; row += 1, y += stepY) {
    const rowOffset = row % 2 === 0 ? 0 : stepX / 2;

    for (let x = stepX / 2 + rowOffset; x < width + stepX; x += stepX) {
      context.fillText(DOWNLOAD_WATERMARK_TEXT, x, y);
    }
  }

  context.restore();
};

const appendSvgWatermarkLayer = (clone: SVGSVGElement) => {
  const viewBoxOrigin = getSvgViewBoxOrigin(clone);
  const logical = getSvgExportPixelSize(clone);
  const fontSize = getWatermarkFontSize(logical.height);
  // Approximate CJK + ASCII width without canvas measure (SVG export path).
  const estimatedTextWidth = DOWNLOAD_WATERMARK_TEXT.length * fontSize * 0.62;
  const { stepX, stepY } = getWatermarkLayout(logical.width, logical.height, estimatedTextWidth, fontSize);
  const ns = 'http://www.w3.org/2000/svg';
  const group = document.createElementNS(ns, 'g');

  group.setAttribute('pointer-events', 'none');
  group.setAttribute('opacity', String(WATERMARK_OPACITY));

  for (let row = 0, y = viewBoxOrigin.y + stepY / 2; y < viewBoxOrigin.y + logical.height + stepY; row += 1, y += stepY) {
    const rowOffset = row % 2 === 0 ? 0 : stepX / 2;

    for (
      let x = viewBoxOrigin.x + stepX / 2 + rowOffset;
      x < viewBoxOrigin.x + logical.width + stepX;
      x += stepX
    ) {
      const text = document.createElementNS(ns, 'text');

      text.setAttribute('x', String(x));
      text.setAttribute('y', String(y));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', '#000000');
      text.setAttribute('font-family', WATERMARK_FONT_FAMILY);
      text.setAttribute('font-size', String(fontSize));
      text.textContent = DOWNLOAD_WATERMARK_TEXT;
      group.append(text);
    }
  }

  clone.append(group);
};

const loadSvgMarkupAsImage = async (svgMarkup: string): Promise<HTMLImageElement | null> => {
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = window.URL.createObjectURL(svgBlob);
  const image = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => {
        resolve();
      };

      image.onerror = () => {
        reject(new Error('svg raster load failed'));
      };

      image.src = objectUrl;
    });

    return image;
  } catch {
    return null;
  } finally {
    window.URL.revokeObjectURL(objectUrl);
  }
};

const canvasToRasterBlob = async (
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpeg' | 'webp',
): Promise<Blob | null> => {
  let mimeType: string;
  if (format === 'png') {
    mimeType = 'image/png';
  } else if (format === 'jpeg') {
    mimeType = 'image/jpeg';
  } else {
    mimeType = 'image/webp';
  }
  const quality = format === 'jpeg' || format === 'webp' ? 0.92 : undefined;

  return await new Promise((resolve) => {
    canvas.toBlob((nextBlob) => resolve(nextBlob), mimeType, quality);
  });
};

const rasterizeLoadedImageToCanvas = (
  image: HTMLImageElement,
  width: number,
  height: number,
): HTMLCanvasElement | null => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas;
};

const rasterizeSvgMarkupToCanvas = async (
  svgMarkup: string,
  width: number,
  height: number,
): Promise<HTMLCanvasElement | null> => {
  const image = await loadSvgMarkupAsImage(svgMarkup);

  if (!image) {
    return null;
  }

  return rasterizeLoadedImageToCanvas(image, width, height);
};

const renderSvgExportTileToCanvas = async (
  baseClone: SVGSVGElement,
  viewBox: string,
  width: number,
  height: number,
): Promise<HTMLCanvasElement | null> => {
  const tileClone = baseClone.cloneNode(true) as SVGSVGElement;

  tileClone.setAttribute('viewBox', viewBox);
  tileClone.setAttribute('width', String(width));
  tileClone.setAttribute('height', String(height));

  const serializer = new XMLSerializer();
  const svgMarkup = serializer.serializeToString(tileClone);

  return rasterizeSvgMarkupToCanvas(svgMarkup, width, height);
};

export const triggerBlobDownload = (blob: Blob, downloadName: string) => {
  const objectUrl = window.URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');

  downloadLink.href = objectUrl;
  downloadLink.download = downloadName;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.URL.revokeObjectURL(objectUrl);
};

const exportSingleTileRasterBlob = async (
  svgElement: SVGSVGElement,
  format: 'png' | 'jpeg' | 'webp',
  width: number,
  height: number,
  withWatermark: boolean,
): Promise<Blob | null> => {
  const clone = prepareSvgExportClone(svgElement, width, height);
  const svgMarkup = new XMLSerializer().serializeToString(clone);
  const canvas = await rasterizeSvgMarkupToCanvas(svgMarkup, width, height);

  if (!canvas) {
    return null;
  }

  if (withWatermark) {
    const context = canvas.getContext('2d');

    if (!context) {
      return null;
    }

    drawRepeatingWatermark(context, width, height);
  }

  return canvasToRasterBlob(canvas, format);
};

const exportTiledRasterBlob = async (
  svgElement: SVGSVGElement,
  format: 'png' | 'jpeg' | 'webp',
  width: number,
  height: number,
  pixelScale: number,
  withWatermark: boolean,
): Promise<Blob | null> => {
  const viewBoxOrigin = getSvgViewBoxOrigin(svgElement);
  const baseClone = prepareSvgExportClone(svgElement, width, height);
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = width;
  finalCanvas.height = height;

  const finalContext = finalCanvas.getContext('2d');

  if (!finalContext) {
    return null;
  }

  finalContext.fillStyle = '#ffffff';
  finalContext.fillRect(0, 0, width, height);

  for (let tileY = 0; tileY < height; tileY += RASTER_EXPORT_TILE_MAX) {
    for (let tileX = 0; tileX < width; tileX += RASTER_EXPORT_TILE_MAX) {
      const tileWidth = Math.min(RASTER_EXPORT_TILE_MAX, width - tileX);
      const tileHeight = Math.min(RASTER_EXPORT_TILE_MAX, height - tileY);
      const viewBoxX = viewBoxOrigin.x + tileX / pixelScale;
      const viewBoxY = viewBoxOrigin.y + tileY / pixelScale;
      const viewBoxWidth = tileWidth / pixelScale;
      const viewBoxHeight = tileHeight / pixelScale;
      const viewBox = `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`;
      const tileCanvas = await renderSvgExportTileToCanvas(baseClone, viewBox, tileWidth, tileHeight);

      if (!tileCanvas) {
        return null;
      }

      finalContext.drawImage(tileCanvas, tileX, tileY);
    }
  }

  if (withWatermark) {
    drawRepeatingWatermark(finalContext, width, height);
  }

  return canvasToRasterBlob(finalCanvas, format);
};

export const exportSvgToRasterBlob = async (
  svgElement: SVGSVGElement,
  format: 'png' | 'jpeg' | 'webp',
  exportHeight: number,
  withWatermark = false,
): Promise<Blob | null> => {
  const { width, height, pixelScale } = getExportDimensions(svgElement, exportHeight);
  const needsTiling = width > RASTER_EXPORT_TILE_MAX || height > RASTER_EXPORT_TILE_MAX;

  if (!needsTiling) {
    return exportSingleTileRasterBlob(svgElement, format, width, height, withWatermark);
  }

  return exportTiledRasterBlob(svgElement, format, width, height, pixelScale, withWatermark);
};

export const downloadBadgeSvg = (
  svgElement: SVGSVGElement,
  fileName: string,
  exportHeight: number,
  withWatermark = false,
) => {
  const { width, height } = getExportDimensions(svgElement, exportHeight);
  const clone = prepareSvgExportClone(svgElement, width, height);

  if (withWatermark) {
    appendSvgWatermarkLayer(clone);
  }

  const serializer = new XMLSerializer();
  const svgMarkup = `${svgExportComment}\n${serializer.serializeToString(clone)}`;
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });

  triggerBlobDownload(svgBlob, fileName);
};

export type BadgeRasterFormat = 'png' | 'jpeg' | 'webp';

export const downloadBadgeRaster = async (
  svgElement: SVGSVGElement,
  fileName: string,
  format: BadgeRasterFormat,
  exportHeight: number,
  withWatermark = false,
) => {
  const blob = await exportSvgToRasterBlob(svgElement, format, exportHeight, withWatermark);

  if (!blob) {
    return false;
  }

  const baseName = getBadgeDownloadBaseName(fileName);
  const extension = format === 'jpeg' ? 'jpg' : format;

  triggerBlobDownload(blob, `${baseName}.${extension}`);
  return true;
};
