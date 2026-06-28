const SIGNATURE_FONT_SIZE = 2048;
const SIGNATURE_GLYPHS = ['0', '1', '4', '8'] as const;
const SIGNATURE_TOLERANCE = 30;
const DEBUG_PREFIX = '[font-signature]';

export const targetFontSignatures = {
  'Microsoft YaHei': [1201, 1201, 1201, 1201],
  'FZHei-B01': [1136, 1136, 1136, 1136],
} as const;

export type DetectableFontFamily = keyof typeof targetFontSignatures;

export type FontDetectionResult = {
  fontFamily: DetectableFontFamily;
  widths: number[] | null;
  expectedWidths: readonly number[];
  detected: boolean;
};

const logFontDetection = (result: FontDetectionResult) => {
  console.debug(DEBUG_PREFIX, result.fontFamily, {
    detected: result.detected,
    expectedSignature: result.expectedWidths,
    measuredSignature: result.widths,
    tolerance: SIGNATURE_TOLERANCE,
  });
};

const toCanvasFontFamily = (fontFamily: string) => (fontFamily.includes(' ') ? `"${fontFamily}"` : fontFamily);

const measureSignature = (targetDocument: Document, fontFamily: DetectableFontFamily) => {
  const canvas = targetDocument.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  context.font = `400 ${SIGNATURE_FONT_SIZE}px ${toCanvasFontFamily(fontFamily)}`;

  return SIGNATURE_GLYPHS.map((glyph) => Math.round(context.measureText(glyph).width));
};

const matchesSignature = (fontFamily: DetectableFontFamily, widths: readonly number[]) => {
  const expectedWidths = targetFontSignatures[fontFamily];

  return widths.every((width, index) => Math.abs(width - expectedWidths[index]) <= SIGNATURE_TOLERANCE);
};

const detectFontsInDocument = async (targetDocument: Document): Promise<FontDetectionResult[]> => {
  await targetDocument.fonts.ready;

  const results = (Object.entries(targetFontSignatures) as [DetectableFontFamily, readonly number[]][]).map(([fontFamily, expectedWidths]) => {
    const widths = measureSignature(targetDocument, fontFamily);

    return {
      fontFamily,
      widths,
      expectedWidths,
      detected: widths ? matchesSignature(fontFamily, widths) : false,
    };
  });

  results.forEach(logFontDetection);

  return results;
};

export const detectTargetFonts = async (): Promise<FontDetectionResult[]> => {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  iframe.src = 'about:blank';
  iframe.style.position = 'fixed';
  iframe.style.inlineSize = '0';
  iframe.style.blockSize = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.border = '0';

  const loaded = new Promise<void>((resolve) => {
    iframe.addEventListener('load', () => resolve(), { once: true });
  });

  document.body.append(iframe);

  try {
    await loaded;

    const frameDocument = iframe.contentDocument;

    if (!frameDocument) {
      const results = (Object.entries(targetFontSignatures) as [DetectableFontFamily, readonly number[]][]).map(([fontFamily, expectedWidths]) => ({
        fontFamily,
        widths: null,
        expectedWidths,
        detected: false,
      }));

      results.forEach(logFontDetection);

      return results;
    }

    return await detectFontsInDocument(frameDocument);
  } finally {
    iframe.remove();
  }
};