import type { SvgBox } from './svgPositioning';
import { PreviewHintRingOverlay } from './PreviewHintRingOverlay';

const LINE_ID_GENERATOR_URL = 'https://kyuri-metro-storybook.umamichi.moe/?path=/docs/kyuri-metro-njmetro-line-id-block-svg-generator--docs';
const LINE_ID_NPM_URL = 'https://www.npmjs.com/package/@kyuri-metro/njmetro-line-id-block-svg-generator';

type LineIdBlockAttributionOverlayProps = Readonly<{
  viewWidth: number;
  viewHeight: number;
  box: SvgBox;
}>;

/** 预览用 HTML 层：不参与 SVG 序列化（下载 / 放大预览仅含 svg）。 */
export function LineIdBlockAttributionOverlay({ viewWidth, viewHeight, box }: LineIdBlockAttributionOverlayProps) {
  return (
    <PreviewHintRingOverlay
      viewWidth={viewWidth}
      viewHeight={viewHeight}
      box={box}
      ariaLabel="线路号方块生成器与 NPM 包"
    >
      <p className="line-id-attribution-tooltip-line">
        南京地铁线路号方块生成器：{' '}
        <a href={LINE_ID_GENERATOR_URL} target="_blank" rel="noopener noreferrer">
          {LINE_ID_GENERATOR_URL}
        </a>
      </p>
      <p className="line-id-attribution-tooltip-line">
        也提供 NPM 包：{' '}
        <a href={LINE_ID_NPM_URL} target="_blank" rel="noopener noreferrer">
          @kyuri-metro/njmetro-line-id-block-svg-generator
        </a>
      </p>
    </PreviewHintRingOverlay>
  );
}
