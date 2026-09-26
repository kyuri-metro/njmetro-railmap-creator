import type { SvgBox } from './svgPositioning';
import { PreviewHintRingOverlay } from './PreviewHintRingOverlay';

type FlipFirstStationHintOverlayProps = Readonly<{
  viewWidth: number;
  viewHeight: number;
  box: SvgBox;
  /** 提示用户应切换到的「反转首站上下」值 */
  suggestFlipTo: boolean;
}>;

/** 预览用：提示勾选/取消「反转首站上下」以消除分段指示与换乘重叠。 */
export function FlipFirstStationHintOverlay({
  viewWidth,
  viewHeight,
  box,
  suggestFlipTo,
}: FlipFirstStationHintOverlayProps) {
  const action = suggestFlipTo ? '勾选' : '取消勾选';
  const message = `可${action}「反转首站上下」，以消除分段指示与换乘线号的重叠`;

  return (
    <PreviewHintRingOverlay
      viewWidth={viewWidth}
      viewHeight={viewHeight}
      box={box}
      ariaLabel={message}
    >
      <p className="line-id-attribution-tooltip-line">{message}</p>
    </PreviewHintRingOverlay>
  );
}
