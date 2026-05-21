import type { ReactNode } from 'react';
import { SiteOverlayBackdrop } from '../overlay/SiteOverlayBackdrop';

export type MobileActionSheetActionItem = {
  kind: 'item';
  id: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
};

/** 在 entries 中显式插入，用于分组（默认不在项与项之间自动加分隔线）。 */
export type MobileActionSheetSeparatorItem = {
  kind: 'separator';
  id: string;
};

export type MobileActionSheetEntry = MobileActionSheetActionItem | MobileActionSheetSeparatorItem;

type MobileActionSheetProps = {
  open: boolean;
  overlayId: string;
  ariaLabel: string;
  entries: MobileActionSheetEntry[];
  onDismiss: () => void;
  /** 根面板标题（可选，仅展示在首屏面板顶栏）。 */
  header?: ReactNode;
};

/**
 * 自底部上滑的操作表；`.mobile-action-sheet-panels` 预留横向滑入二级面板（项尾可加 ›）。
 */
export function MobileActionSheet({ open, overlayId, ariaLabel, entries, onDismiss, header }: MobileActionSheetProps) {
  return (
    <SiteOverlayBackdrop open={open} overlayId={overlayId} align="bottom" onDismiss={onDismiss}>
      <div
        className="mobile-action-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mobile-action-sheet-panels">
          <div className="mobile-action-sheet-panel" role="menu">
            {header ? <div className="mobile-action-sheet-header">{header}</div> : null}
            <ul className="mobile-action-sheet-list">
              {entries.map((entry) => {
                if (entry.kind === 'separator') {
                  return (
                    <li key={entry.id} className="mobile-action-sheet-list-item" role="none">
                      <div className="mobile-action-sheet-separator" role="separator" />
                    </li>
                  );
                }

                return (
                  <li key={entry.id} className="mobile-action-sheet-list-item" role="none">
                    <button
                      type="button"
                      className="mobile-action-sheet-item"
                      role="menuitem"
                      onClick={() => {
                        entry.onSelect();
                        onDismiss();
                      }}
                    >
                      <span className="mobile-action-sheet-item-icon" aria-hidden="true">
                        {entry.icon}
                      </span>
                      <span className="mobile-action-sheet-item-label">{entry.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </SiteOverlayBackdrop>
  );
}
