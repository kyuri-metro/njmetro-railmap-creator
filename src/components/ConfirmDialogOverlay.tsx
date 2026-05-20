import type { ReactNode } from 'react';
import { SiteOverlayBackdrop, type SiteOverlayAlign } from '../overlay/SiteOverlayBackdrop';

type ConfirmDialogOverlayProps = {
  open: boolean;
  overlayId: string;
  onDismiss: () => void;
  onExited?: () => void;
  children: ReactNode;
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
