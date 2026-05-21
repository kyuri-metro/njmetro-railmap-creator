import type { ReactNode } from 'react';
import { SiteOverlayBackdrop, type SiteOverlayAlign } from '../overlay/SiteOverlayBackdrop';

type ConfirmDialogOverlayProps = {
  open: boolean;
  overlayId: string;
  onDismiss: () => void;
  onExited?: () => void;
  children: ReactNode;
  /** 默认居中；`bottom` 用于自底部上滑的移动端操作表。 */
  align?: SiteOverlayAlign;
  dismissOnEscape?: boolean;
};

export function ConfirmDialogOverlay({
  open,
  overlayId,
  onDismiss,
  onExited,
  children,
  align = 'centered',
  dismissOnEscape = true,
}: ConfirmDialogOverlayProps) {
  return (
    <SiteOverlayBackdrop
      open={open}
      overlayId={overlayId}
      align={align}
      onDismiss={onDismiss}
      onExited={onExited}
      dismissOnEscape={dismissOnEscape}
    >
      {children}
    </SiteOverlayBackdrop>
  );
}
