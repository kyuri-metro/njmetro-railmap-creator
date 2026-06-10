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

export const measureDirectionToLabelWidth = () =>
  measureSvgGroupWidth((group) => {
    const zh = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    zh.setAttribute('font-size', '115.5px');
    zh.setAttribute('x', '0');
    zh.setAttribute('y', '155.5');
    zh.setAttribute('font-family', sansZhFontStack);
    zh.setAttribute('style', 'letter-spacing: 6px');
    zh.textContent = '往';

    const en = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    en.setAttribute('font-size', '55.5px');
    en.setAttribute('x', '10');
    en.setAttribute('y', '238.5');
    en.setAttribute('font-family', sansLatinFontStack);
    en.setAttribute('style', 'letter-spacing: 3.5px');
    en.textContent = 'To';

    group.append(zh, en);
  });

export const measureDirectionNextLabelWidth = () =>
  measureSvgGroupWidth((group) => {
    const zh = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    zh.setAttribute('font-size', '115.5px');
    zh.setAttribute('x', '0');
    zh.setAttribute('y', '157.5');
    zh.setAttribute('font-family', sansZhFontStack);
    zh.setAttribute('style', 'letter-spacing: 8px');
    zh.textContent = '下一站';

    const en = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    en.setAttribute('font-size', '55.5px');
    en.setAttribute('x', '11.5');
    en.setAttribute('y', '241');
    en.setAttribute('font-family', sansLatinFontStack);
    en.setAttribute('style', 'letter-spacing: 3.5px');
    en.textContent = 'Next Station';

    group.append(zh, en);
  });

export const directionStationZhFontSize = 195.5;
export const directionStationEnFontSize = 82.5;

export const measureDirectionStationZhWidth = (text: string, letterSpacing: number, scaleX: number) =>
  measureBadgeTextWidth(text, sansZhFontStack, directionStationZhFontSize, letterSpacing, scaleX);

export const measureDirectionStationEnWidth = (text: string, letterSpacing: number, scaleX: number) =>
  measureBadgeTextWidth(text.toUpperCase(), sansLatinFontStack, directionStationEnFontSize, letterSpacing, scaleX);
