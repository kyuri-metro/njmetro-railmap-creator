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
import { pushOverlayHistoryState } from './overlayHistory';
import { computeOverlayZIndex, type OverlayStackEntry } from './overlayStackTypes';

type OverlayStackContextValue = {
  register: (entry: OverlayStackEntry) => void;
  unregister: (id: string) => void;
  isTop: (id: string) => boolean;
  getZIndex: (id: string) => number;
  /** 叠层打开时入 history 栈（同一 id 重复注册不重复 push）。 */
  pushOverlayHistory: (id: string) => void;
  /** 叠层由 UI/Esc/背景关闭时同步 history（浏览器返回触发的关闭勿调用）。 */
  syncOverlayHistoryOnUiClose: (id: string) => void;
  /** 浏览器返回已弹出对应 history 条目时，仅更新内部记录。 */
  acknowledgeOverlayHistoryPop: (id: string) => void;
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
  const orderRef = useRef<string[]>([]);
  const historyActiveIdsRef = useRef(new Set<string>());
  const ignoreNextPopstateRef = useRef(false);
  const [order, setOrder] = useState<string[]>([]);

  orderRef.current = order;

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

  const pushOverlayHistory = useCallback((id: string) => {
    if (historyActiveIdsRef.current.has(id)) {
      return;
    }

    historyActiveIdsRef.current.add(id);
    pushOverlayHistoryState(id);
  }, []);

  const syncOverlayHistoryOnUiClose = useCallback((id: string) => {
    if (!historyActiveIdsRef.current.has(id)) {
      return;
    }

    historyActiveIdsRef.current.delete(id);
    ignoreNextPopstateRef.current = true;
    history.back();
  }, []);

  const acknowledgeOverlayHistoryPop = useCallback((id: string) => {
    historyActiveIdsRef.current.delete(id);
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
      pushOverlayHistory,
      syncOverlayHistoryOnUiClose,
      acknowledgeOverlayHistoryPop,
    }),
    [
      acknowledgeOverlayHistoryPop,
      order,
      pushOverlayHistory,
      register,
      syncOverlayHistoryOnUiClose,
      topId,
      unregister,
    ],
  );

  useEffect(() => {
    const onPopState = () => {
      if (ignoreNextPopstateRef.current) {
        ignoreNextPopstateRef.current = false;
        return;
      }

      const top = orderRef.current[orderRef.current.length - 1];

      if (!top) {
        return;
      }

      const entry = entriesRef.current.get(top);

      if (!entry) {
        return;
      }

      acknowledgeOverlayHistoryPop(top);
      entry.onDismiss();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [acknowledgeOverlayHistoryPop]);

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
