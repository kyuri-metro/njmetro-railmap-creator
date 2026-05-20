import type { MouseEventHandler, ReactNode } from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayPresence, withOverlayOpen } from '../hooks/useOverlayPresence';
import { useOverlayStackEntry } from './useOverlayStackEntry';

/** 叠层内容在 backdrop 内的对齐方式（与 z-index 无关） */
export type SiteOverlayAlign = 'centered' | 'top';

const alignClassName: Record<SiteOverlayAlign, string> = {
  centered: 'site-overlay-backdrop site-overlay-backdrop--centered',
  top: 'site-overlay-backdrop site-overlay-backdrop--top',
};

export type SiteOverlayBackdropProps = {
  open: boolean;
  overlayId: string;
  align?: SiteOverlayAlign;
  onDismiss: () => void;
  onExited?: () => void;
  dismissOnEscape?: boolean;
  children: ReactNode;
};

export function SiteOverlayBackdrop({
  open,
  overlayId,
  align = 'centered',
  onDismiss,
  onExited,
  dismissOnEscape = true,
  children,
}: SiteOverlayBackdropProps) {
  const { mounted, isOpen, overlayRef } = useOverlayPresence<HTMLDivElement>(open);
  const { isBackdropActive, zIndex } = useOverlayStackEntry({
    id: overlayId,
    open,
    onDismiss,
    dismissOnEscape,
  });

  useEffect(() => {
    if (!mounted) {
      onExited?.();
    }
  }, [mounted, onExited]);

  if (!mounted) {
    return null;
  }

  const onBackdropClick: MouseEventHandler<HTMLDivElement> = (event) => {
    if (!isBackdropActive || event.target !== event.currentTarget) {
      return;
    }

    onDismiss();
  };

  return createPortal(
    <div
      ref={overlayRef}
      className={withOverlayOpen(
        `${alignClassName[align]}${isBackdropActive ? '' : ' site-overlay-backdrop-inactive'}`,
        isOpen,
      )}
      style={{ zIndex }}
      role="presentation"
      onClick={onBackdropClick}
    >
      {children}
    </div>,
    document.body,
  );
}
