import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { mergeOverlayRefs, useOverlayPresence, withOverlayOpen } from '../hooks/useOverlayPresence';
import { DropdownMenuChevron } from './DropdownMenuChevron';

type FloatingMenuGeometry = {
  top: number;
  left: number;
  maxHeight?: number;
};

const computeFloatingMenuGeometry = (trigger: HTMLElement, menu: HTMLElement): FloatingMenuGeometry => {
  const pad = 8;
  const gap = 4;
  const minScrollHeight = 120;
  const rect = trigger.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const menuWidth = menu.offsetWidth;
  const menuHeight = menu.offsetHeight;

  let left = rect.right - menuWidth;
  if (left < pad) {
    left = rect.left;
  }
  left = Math.max(pad, Math.min(left, vw - menuWidth - pad));

  let top = rect.bottom + gap;
  let maxHeight: number | undefined;
  if (top + menuHeight > vh - pad) {
    const topIfAbove = rect.top - gap - menuHeight;
    if (topIfAbove >= pad) {
      top = topIfAbove;
    } else {
      maxHeight = Math.max(minScrollHeight, vh - pad - top);
    }
  }
  return { top, left, maxHeight };
};

function useYamlIoMenuGeometry(menuOpen: boolean, menuMounted: boolean) {
  const menuPanelRef = useRef<HTMLUListElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [menuGeometry, setMenuGeometry] = useState<FloatingMenuGeometry | null>(null);

  useLayoutEffect(() => {
    if (!menuOpen || !menuMounted) {
      setMenuGeometry(null);
      return;
    }
    const update = () => {
      const trigger = triggerRef.current;
      const menu = menuPanelRef.current;
      if (!trigger || !menu) {
        return;
      }
      setMenuGeometry(computeFloatingMenuGeometry(trigger, menu));
    };
    update();
    const scrollRoots: HTMLElement[] = [];
    const main = document.querySelector<HTMLElement>('.app-main');
    if (main) {
      scrollRoots.push(main);
    }
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    for (const root of scrollRoots) {
      root.addEventListener('scroll', update, { passive: true });
    }
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      for (const root of scrollRoots) {
        root.removeEventListener('scroll', update);
      }
    };
  }, [menuOpen, menuMounted]);

  return { menuPanelRef, triggerRef, menuGeometry };
}

type StationYamlImportMenuProps = {
  yamlFileInputRef: RefObject<HTMLInputElement | null>;
  rmgToolConfigured: boolean;
  onOpenRmgImport: () => void;
};

export function StationYamlImportMenu({ yamlFileInputRef, rmgToolConfigured, onOpenRmgImport }: StationYamlImportMenuProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const { mounted: menuMounted, isOpen: menuShown, overlayRef: menuOverlayRef } =
    useOverlayPresence<HTMLUListElement>(menuOpen);
  const { menuPanelRef, triggerRef, menuGeometry } = useYamlIoMenuGeometry(menuOpen, menuMounted);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || menuPanelRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => document.removeEventListener('mousedown', onDocumentMouseDown);
  }, [menuOpen, menuPanelRef]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [menuOpen]);

  const menuPanel = menuMounted ? (
    <ul
      ref={mergeOverlayRefs(menuOverlayRef, menuPanelRef)}
      id={menuId}
      className={withOverlayOpen('dropdown-menu-panel', menuShown && menuGeometry !== null)}
      role="menu"
      aria-label="导入线路数据"
      style={{
        top: menuGeometry?.top ?? -9999,
        left: menuGeometry?.left ?? -9999,
        maxHeight: menuGeometry?.maxHeight,
        overflowY: menuGeometry?.maxHeight ? 'auto' : undefined,
      }}
    >
      <li role="none">
        <button
          type="button"
          className="dropdown-menu-item"
          role="menuitem"
          onClick={() => {
            yamlFileInputRef.current?.click();
            setMenuOpen(false);
          }}
        >
          从 YAML 文件导入…
        </button>
      </li>
      <li className="dropdown-menu-separator" role="separator" aria-orientation="horizontal" />
      <li role="none">
        <button
          type="button"
          className="dropdown-menu-item"
          role="menuitem"
          disabled={!rmgToolConfigured}
          title={!rmgToolConfigured ? 'RMG 转换窗口未配置，无法使用此选项' : undefined}
          onClick={() => {
            if (!rmgToolConfigured) {
              return;
            }
            onOpenRmgImport();
            setMenuOpen(false);
          }}
        >
          导入 RMG JSON 存档
        </button>
      </li>
    </ul>
  ) : null;

  return (
    <div className="dropdown-menu" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="secondary-button dropdown-menu-trigger"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setMenuOpen((o) => !o)}
      >
        导入 <DropdownMenuChevron />
      </button>
      {menuPanel ? createPortal(menuPanel, document.body) : null}
    </div>
  );
}

type StationYamlExportMenuProps = {
  rmgToolConfigured: boolean;
  onDownloadYaml: () => void;
  onOpenRmgExport: () => void;
};

export function StationYamlExportMenu({ rmgToolConfigured, onDownloadYaml, onOpenRmgExport }: StationYamlExportMenuProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const { mounted: menuMounted, isOpen: menuShown, overlayRef: menuOverlayRef } =
    useOverlayPresence<HTMLUListElement>(menuOpen);
  const { menuPanelRef, triggerRef, menuGeometry } = useYamlIoMenuGeometry(menuOpen, menuMounted);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || menuPanelRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => document.removeEventListener('mousedown', onDocumentMouseDown);
  }, [menuOpen, menuPanelRef]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [menuOpen]);

  const menuPanel = menuMounted ? (
    <ul
      ref={mergeOverlayRefs(menuOverlayRef, menuPanelRef)}
      id={menuId}
      className={withOverlayOpen('dropdown-menu-panel', menuShown && menuGeometry !== null)}
      role="menu"
      aria-label="导出线路数据"
      style={{
        top: menuGeometry?.top ?? -9999,
        left: menuGeometry?.left ?? -9999,
        maxHeight: menuGeometry?.maxHeight,
        overflowY: menuGeometry?.maxHeight ? 'auto' : undefined,
      }}
    >
      <li role="none">
        <button
          type="button"
          className="dropdown-menu-item"
          role="menuitem"
          onClick={() => {
            onDownloadYaml();
            setMenuOpen(false);
          }}
        >
          下载 YAML
        </button>
      </li>
      <li className="dropdown-menu-separator" role="separator" aria-orientation="horizontal" />
      <li role="none">
        <button
          type="button"
          className="dropdown-menu-item"
          role="menuitem"
          disabled={!rmgToolConfigured}
          title={!rmgToolConfigured ? 'RMG 转换窗口未配置，无法使用此选项' : undefined}
          onClick={() => {
            if (!rmgToolConfigured) {
              return;
            }
            onOpenRmgExport();
            setMenuOpen(false);
          }}
        >
          导出 RMG JSON 存档
        </button>
      </li>
    </ul>
  ) : null;

  return (
    <div className="dropdown-menu" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="secondary-button dropdown-menu-trigger"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setMenuOpen((o) => !o)}
      >
        导出 <DropdownMenuChevron />
      </button>
      {menuPanel ? createPortal(menuPanel, document.body) : null}
    </div>
  );
}
