import { directionBadgeLabelText, directionBadgeStationNameText } from './directionBadgeLayout';
import { sansLatinFontStack, sansZhFontStack } from './fontStacks';

let measureSvgRoot: SVGSVGElement | null = null;

const getMeasureSvgRoot = () => {
  if (typeof document === 'undefined') {
    return null;
  }

  if (!measureSvgRoot) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.style.left = '-10000px';
    svg.style.top = '0';
    svg.style.overflow = 'hidden';
    document.body.appendChild(svg);
    measureSvgRoot = svg;
  }

  return measureSvgRoot;
};

const measureSvgTextWidth = (
  text: string,
  fontFamily: string,
  fontSize: number,
  letterSpacing = 0,
  scaleX = 1,
) => {
  const svg = getMeasureSvgRoot();

  if (!svg || text.length === 0) {
    return 0;
  }

  const root = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  textNode.setAttribute('x', '0');
  textNode.setAttribute('y', `${fontSize}`);
  textNode.setAttribute('font-size', `${fontSize}px`);
  textNode.setAttribute('font-family', fontFamily);

  if (letterSpacing !== 0) {
    textNode.setAttribute('style', `letter-spacing: ${letterSpacing}px`);
  }

  textNode.textContent = text;

  if (scaleX !== 1) {
    const scaleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    scaleGroup.setAttribute('transform', `scale(${scaleX}, 1)`);
    scaleGroup.appendChild(textNode);
    root.appendChild(scaleGroup);
  } else {
    root.appendChild(textNode);
  }

  svg.appendChild(root);
  const width = root.getBBox().width;
  svg.removeChild(root);

  return width;
};

const measureSvgGroupWidth = (buildGroup: (group: SVGGElement) => void) => {
  const svg = getMeasureSvgRoot();

  if (!svg) {
    return 0;
  }

  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  buildGroup(group);
  svg.appendChild(group);
  const width = group.getBBox().width;
  svg.removeChild(group);

  return width;
};

export const measureBadgeTextWidth = (
  text: string,
  fontFamilyStack: string,
  fontSize: number,
  letterSpacing = 0,
  scaleX = 1,
) => measureSvgTextWidth(text, fontFamilyStack, fontSize, letterSpacing, scaleX);

const appendMeasuredLabelLine = (
  group: SVGGElement,
  spec: { fontSize: number; x: number; y: number; letterSpacing: number },
  fontFamily: string,
  text: string,
) => {
  const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  textNode.setAttribute('font-size', `${spec.fontSize}px`);
  textNode.setAttribute('x', `${spec.x}`);
  textNode.setAttribute('y', `${spec.y}`);
  textNode.setAttribute('font-family', fontFamily);
  textNode.setAttribute('style', `letter-spacing: ${spec.letterSpacing}px`);
  textNode.textContent = text;
  group.append(textNode);
};

export const measureDirectionToLabelWidth = () => {
  const { zh, en } = directionBadgeLabelText.to;

  return measureSvgGroupWidth((group) => {
    appendMeasuredLabelLine(group, zh, sansZhFontStack, '往');
    appendMeasuredLabelLine(group, en, sansLatinFontStack, 'To');
  });
};

export const measureDirectionNextLabelWidth = () => {
  const { zh, en } = directionBadgeLabelText.next;

  return measureSvgGroupWidth((group) => {
    appendMeasuredLabelLine(group, zh, sansZhFontStack, '下一站');
    appendMeasuredLabelLine(group, en, sansLatinFontStack, 'Next Station');
  });
};

export const directionStationZhFontSize = directionBadgeStationNameText.zhFontSize;
export const directionStationEnFontSize = directionBadgeStationNameText.enFontSize;

export const measureDirectionStationZhWidth = (text: string, letterSpacing: number, scaleX: number) =>
  measureBadgeTextWidth(text, sansZhFontStack, directionStationZhFontSize, letterSpacing, scaleX);

export const measureDirectionStationEnWidth = (text: string, letterSpacing: number, scaleX: number) =>
  measureBadgeTextWidth(text.toUpperCase(), sansLatinFontStack, directionStationEnFontSize, letterSpacing, scaleX);
