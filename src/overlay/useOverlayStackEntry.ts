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
  const { register, unregister, isTop, getZIndex } = useOverlayStack();
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

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

  return {
    isBackdropActive: open && isTop(id),
    zIndex: getZIndex(id),
  };
}
