import type { MouseEventHandler, ReactNode } from 'react';
import { useEffect } from 'react';
import { useOverlayPresence, withOverlayOpen } from '../hooks/useOverlayPresence';

type ConfirmDialogOverlayProps = {
  open: boolean;
  onDismiss: () => void;
  onExited?: () => void;
  children: ReactNode;
};

export function ConfirmDialogOverlay({ open, onDismiss, onExited, children }: ConfirmDialogOverlayProps) {
  const { mounted, isOpen, overlayRef } = useOverlayPresence<HTMLDivElement>(open);

  useEffect(() => {
    if (!mounted) {
      onExited?.();
    }
  }, [mounted, onExited]);

  if (!mounted) {
    return null;
  }

  const onBackdropClick: MouseEventHandler<HTMLDivElement> = () => {
    onDismiss();
  };

  return (
    <div
      ref={overlayRef}
      className={withOverlayOpen('confirm-dialog-backdrop', isOpen)}
      role="presentation"
      onClick={onBackdropClick}
    >
      {children}
    </div>
  );
}
