import { useEffect, useRef } from 'react';
import { useOverlayStack } from './OverlayStackProvider';

type UseOverlayStackEntryOptions = {
  id: string;
  open: boolean;
  onDismiss: () => void;
  dismissOnEscape?: boolean;
};

export function useOverlayStackEntry({
  id,
  open,
  onDismiss,
  dismissOnEscape = true,
}: UseOverlayStackEntryOptions) {
  const {
    register,
    unregister,
    isTop,
    getZIndex,
    pushOverlayHistory,
    syncOverlayHistoryOnUiClose,
  } = useOverlayStack();
  const onDismissRef = useRef(onDismiss);
  const openRef = useRef(open);
  onDismissRef.current = onDismiss;
  openRef.current = open;

  useEffect(() => {
    if (!open) {
      return;
    }

    register({
      id,
      onDismiss: () => onDismissRef.current(),
      dismissOnEscape,
    });

    return () => {
      unregister(id);
    };
  }, [dismissOnEscape, id, open, register, unregister]);

  useEffect(() => {
    if (!open) {
      return;
    }

    pushOverlayHistory(id);

    return () => {
      queueMicrotask(() => {
        if (!openRef.current) {
          syncOverlayHistoryOnUiClose(id);
        }
      });
    };
  }, [id, open, pushOverlayHistory, syncOverlayHistoryOnUiClose]);

  return {
    isBackdropActive: open && isTop(id),
    zIndex: getZIndex(id),
  };
}
