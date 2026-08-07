import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { mergeOverlayRefs, useOverlayPresence, withOverlayOpen } from '@umamichi-ui/common-components/presence';
import type { StationItem } from '../features/generatorSlice';

const PencilIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M4 16.75V20h3.25l9.58-9.59-3.25-3.25L4 16.75Zm14.71-8.04a1.01 1.01 0 0 0 0-1.42l-2-2a1.01 1.01 0 0 0-1.42 0l-1.56 1.55 3.25 3.25 1.73-1.38Z"
      fill="currentColor"
    />
  </svg>
);

type StationNameField = 'chName' | 'enName';

type StationTableProps = Readonly<{
  currentStnId: string;
  stations: StationItem[];
  focusChNameStationId?: string | null;
  onFocusChNameHandled?: () => void;
  onEdit: (station: StationItem) => void;
  onInsert: (position: 'before' | 'after' | 'start' | 'end') => void;
  onInsertRelativeTo: (stationId: string, position: 'before' | 'after') => void;
  onRequestDelete: (station: StationItem) => void;
  onReverseList: () => void;
  onSelect: (stationId: string) => void;
  onCommitName: (stationId: string, field: StationNameField, value: string) => void;
}>;

type RowContextMenuState = Readonly<{
  station: StationItem;
  clientX: number;
  clientY: number;
}>;

const CONTEXT_MENU_PAD = 8;

const clampContextMenuPosition = (clientX: number, clientY: number, menu: HTMLElement) => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const menuWidth = menu.offsetWidth;
  const menuHeight = menu.offsetHeight;
  const left = Math.max(CONTEXT_MENU_PAD, Math.min(clientX, vw - menuWidth - CONTEXT_MENU_PAD));
  const top = Math.max(CONTEXT_MENU_PAD, Math.min(clientY, vh - menuHeight - CONTEXT_MENU_PAD));
  return { left, top };
};

type StationCellInputProps = Readonly<{
  value: string;
  className: string;
  ariaLabel: string;
  placeholder?: string;
  inputRef?: (element: HTMLInputElement | null) => void;
  onSelectStation: () => void;
  onCommit: (value: string) => void;
}>;

function StationCellInput({
  value,
  className,
  ariaLabel,
  placeholder,
  inputRef,
  onSelectStation,
  onCommit,
}: StationCellInputProps) {
  const [draft, setDraft] = useState(value);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(value);
    }
  }, [value]);

  const commit = () => {
    const next = draft.trim();
    setDraft(next);
    if (next !== value) {
      onCommit(next);
    }
  };

  const cancel = () => {
    setDraft(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
      event.currentTarget.blur();
    }
  };

  return (
    <input
      ref={inputRef}
      className={className}
      value={draft}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onClick={(event) => event.stopPropagation()}
      onFocus={() => {
        focusedRef.current = true;
        onSelectStation();
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        focusedRef.current = false;
        commit();
      }}
      onKeyDown={onKeyDown}
    />
  );
}

export function StationTable({
  currentStnId,
  stations,
  focusChNameStationId = null,
  onFocusChNameHandled,
  onEdit,
  onInsert,
  onInsertRelativeTo,
  onRequestDelete,
  onReverseList,
  onSelect,
  onCommitName,
}: StationTableProps) {
  const menuId = useId();
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const chNameInputRefs = useRef(new Map<string, HTMLInputElement>());
  const [contextMenu, setContextMenu] = useState<RowContextMenuState | null>(null);
  const [menuGeometry, setMenuGeometry] = useState<{ left: number; top: number } | null>(null);
  const menuOpen = contextMenu !== null;
  const { mounted: menuMounted, isOpen: menuShown, overlayRef: menuOverlayRef } = useOverlayPresence(menuOpen);

  const closeContextMenu = () => {
    setContextMenu(null);
    setMenuGeometry(null);
  };

  const openRowContextMenu = (event: MouseEvent<HTMLTableRowElement>, station: StationItem) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuGeometry(null);
    setContextMenu({
      station,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  };

  useLayoutEffect(() => {
    if (!focusChNameStationId) {
      return;
    }

    const input = chNameInputRefs.current.get(focusChNameStationId);
    if (input) {
      input.focus();
      input.select();
    }
    onFocusChNameHandled?.();
  }, [focusChNameStationId, stations]); // onFocusChNameHandled intentionally omitted (parent inline setter)

  useLayoutEffect(() => {
    if (!contextMenu || !menuMounted) {
      return;
    }

    const menu = menuPanelRef.current;
    if (!menu) {
      return;
    }

    setMenuGeometry(clampContextMenuPosition(contextMenu.clientX, contextMenu.clientY, menu));
  }, [contextMenu, menuMounted]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const onDocumentMouseDown = (event: globalThis.MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (menuPanelRef.current?.contains(target)) {
        return;
      }
      closeContextMenu();
    };

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeContextMenu();
      }
    };

    const onScrollOrResize = () => {
      closeContextMenu();
    };

    document.addEventListener('mousedown', onDocumentMouseDown);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', onScrollOrResize);
    document.querySelector('.app-main')?.addEventListener('scroll', onScrollOrResize, { passive: true });

    return () => {
      document.removeEventListener('mousedown', onDocumentMouseDown);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('resize', onScrollOrResize);
      document.querySelector('.app-main')?.removeEventListener('scroll', onScrollOrResize);
    };
  }, [menuOpen]);

  const menuPanel = menuMounted && contextMenu ? (
    <div
      ref={mergeOverlayRefs(menuOverlayRef, menuPanelRef)}
      className={withOverlayOpen('dropdown-menu-panel', menuShown && menuGeometry !== null)}
      style={{
        top: menuGeometry?.top ?? -9999,
        left: menuGeometry?.left ?? -9999,
      }}
    >
      <ul id={menuId} className="dropdown-menu-panel__list" role="menu" aria-label="站点行操作">
        <li role="none">
          <button
            type="button"
            className="dropdown-menu-item"
            role="menuitem"
            onClick={() => {
              onInsertRelativeTo(contextMenu.station.id, 'before');
              closeContextMenu();
            }}
          >
            之前插入
          </button>
        </li>
        <li role="none">
          <button
            type="button"
            className="dropdown-menu-item"
            role="menuitem"
            onClick={() => {
              onInsertRelativeTo(contextMenu.station.id, 'after');
              closeContextMenu();
            }}
          >
            之后插入
          </button>
        </li>
        <li className="dropdown-menu-separator" role="separator" aria-orientation="horizontal" />
        <li role="none">
          <button
            type="button"
            className="dropdown-menu-item"
            role="menuitem"
            onClick={() => {
              onRequestDelete(contextMenu.station);
              closeContextMenu();
            }}
          >
            删除
          </button>
        </li>
      </ul>
    </div>
  ) : null;

  return (
    <section className="panel-section">
      <div className="section-toolbar station-section-toolbar">
        <div className="station-toolbar-cluster">
          <div className="toolbar-buttons">
            <button type="button" className="outline-button" onClick={() => onInsert('after')}>
              之后插入
            </button>
            <button type="button" className="outline-button" onClick={() => onInsert('before')}>
              之前插入
            </button>
            <button type="button" className="outline-button" onClick={() => onInsert('start')}>
              最前插入
            </button>
            <button type="button" className="outline-button" onClick={() => onInsert('end')}>
              最后插入
            </button>
          </div>
        </div>
        <button type="button" className="outline-button station-reverse-list-button" onClick={onReverseList}>
          反转列表
        </button>
      </div>

      <div className="table-wrap">
        <table className="station-table">
          <colgroup>
            <col className="station-col-name" />
            <col className="station-col-en" />
            <col className="station-col-transfer" />
            <col className="station-col-action" />
          </colgroup>
          <thead>
            <tr>
              <th>中文名</th>
              <th>英文名</th>
              <th>换乘线路</th>
              <th aria-label="编辑换乘与类型" />
            </tr>
          </thead>
          <tbody>
            {stations.map((station) => {
              const isCurrent = station.id === currentStnId;
              const displayName = station.chName.trim() || '未命名';

              return (
                <tr
                  key={station.id}
                  className={isCurrent ? 'is-current' : undefined}
                  onClick={() => onSelect(station.id)}
                  onContextMenu={(event) => openRowContextMenu(event, station)}
                >
                  <td>
                    <StationCellInput
                      className="station-cell-input station-cell-input--ch"
                      value={station.chName}
                      ariaLabel={`${displayName} 中文名`}
                      placeholder="中文名"
                      inputRef={(element) => {
                        if (element) {
                          chNameInputRefs.current.set(station.id, element);
                        } else {
                          chNameInputRefs.current.delete(station.id);
                        }
                      }}
                      onSelectStation={() => onSelect(station.id)}
                      onCommit={(value) => onCommitName(station.id, 'chName', value)}
                    />
                  </td>
                  <td>
                    <StationCellInput
                      className="station-cell-input station-cell-input--en"
                      value={station.enName}
                      ariaLabel={`${displayName} 英文名`}
                      placeholder="英文名"
                      onSelectStation={() => onSelect(station.id)}
                      onCommit={(value) => onCommitName(station.id, 'enName', value)}
                    />
                  </td>
                  <td>
                    {station.transfer.length > 0 ? (
                      <div className="transfer-list">
                        {station.transfer.map((line) => (
                          <span
                            key={`${station.id}-${line.id}-${line.color}-${line.textColor}`}
                            className="transfer-chip"
                            style={
                              {
                                '--transfer-color': line.color,
                                '--transfer-text': line.textColor,
                              } as CSSProperties
                            }
                          >
                            {line.id}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="station-action-cell">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(station);
                      }}
                      aria-label={`编辑换乘与类型：${displayName}`}
                    >
                      <PencilIcon />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {menuPanel ? createPortal(menuPanel, document.body) : null}
    </section>
  );
}
