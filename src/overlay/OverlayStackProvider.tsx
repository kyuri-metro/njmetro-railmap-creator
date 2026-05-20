import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { computeOverlayZIndex, type OverlayStackEntry } from './overlayStackTypes';

type OverlayStackContextValue = {
  register: (entry: OverlayStackEntry) => void;
  unregister: (id: string) => void;
  isTop: (id: string) => boolean;
  getZIndex: (id: string) => number;
};

const OverlayStackContext = createContext<OverlayStackContextValue | null>(null);

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
};

export function OverlayStackProvider({ children }: { children: ReactNode }) {
  const entriesRef = useRef(new Map<string, OverlayStackEntry>());
  const [order, setOrder] = useState<string[]>([]);

  const register = useCallback((entry: OverlayStackEntry) => {
    entriesRef.current.set(entry.id, entry);
    setOrder((prev) => {
      const without = prev.filter((entryId) => entryId !== entry.id);
      return [...without, entry.id];
    });
  }, []);

  const unregister = useCallback((id: string) => {
    entriesRef.current.delete(id);
    setOrder((prev) => prev.filter((entryId) => entryId !== id));
  }, []);

  const topId = order[order.length - 1] ?? null;

  const value = useMemo<OverlayStackContextValue>(
    () => ({
      register,
      unregister,
      isTop: (id) => topId === id,
      getZIndex: (id) => {
        const index = order.indexOf(id);
        return computeOverlayZIndex(index < 0 ? 0 : index);
      },
    }),
    [order, register, topId, unregister],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isEditableTarget(event.target)) {
        return;
      }

      const top = topId ? entriesRef.current.get(topId) : undefined;

      if (!top || top.dismissOnEscape === false) {
        return;
      }

      event.preventDefault();
      top.onDismiss();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [topId]);

  return <OverlayStackContext.Provider value={value}>{children}</OverlayStackContext.Provider>;
}

export function useOverlayStack() {
  const context = useContext(OverlayStackContext);

  if (!context) {
    throw new Error('useOverlayStack must be used within OverlayStackProvider');
  }

  return context;
}
