import type { StationItem } from '../features/generatorSlice';

const PencilIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M4 16.75V20h3.25l9.58-9.59-3.25-3.25L4 16.75Zm14.71-8.04a1.01 1.01 0 0 0 0-1.42l-2-2a1.01 1.01 0 0 0-1.42 0l-1.56 1.55 3.25 3.25 1.73-1.38Z"
      fill="currentColor"
    />
  </svg>
);

type StationTableProps = {
  currentStnId: string;
  stations: StationItem[];
  onEdit: (station: StationItem) => void;
  onInsert: (position: 'before' | 'after' | 'start' | 'end') => void;
  onReverseList: () => void;
  onSelect: (stationId: string) => void;
};

export function StationTable({ currentStnId, stations, onEdit, onInsert, onReverseList, onSelect }: StationTableProps) {
  return (
    <section className="panel-section">
      <div className="section-toolbar station-section-toolbar">
        <div className="station-toolbar-cluster">
          <div className="toolbar-buttons">
            <button type="button" className="secondary-button" onClick={() => onInsert('after')}>
              之后插入
            </button>
            <button type="button" className="secondary-button" onClick={() => onInsert('before')}>
              之前插入
            </button>
            <button type="button" className="secondary-button" onClick={() => onInsert('start')}>
              最前插入
            </button>
            <button type="button" className="secondary-button" onClick={() => onInsert('end')}>
              最后插入
            </button>
          </div>
          <p className="toolbar-hint">点击表格行可切换当前站点，之前/之后插入会基于当前站点执行。</p>
        </div>
        <button type="button" className="secondary-button station-reverse-list-button" onClick={onReverseList}>
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
              <th aria-label="编辑操作" />
            </tr>
          </thead>
          <tbody>
            {stations.map((station) => {
              const isCurrent = station.id === currentStnId;

              return (
                <tr
                  key={station.id}
                  className={isCurrent ? 'is-current' : undefined}
                  onClick={() => onSelect(station.id)}
                >
                  <td>
                    <div className="station-name-cell">
                      <span className="station-name-text">{station.chName}</span>
                      {isCurrent ? <span className="current-badge">当前</span> : null}
                    </div>
                  </td>
                  <td>
                    <span className="station-en-name">{station.enName}</span>
                  </td>
                  <td>
                    {station.transfer.length > 0 ? (
                      <div className="transfer-list">
                        {station.transfer.map((line) => (
                          <span
                            key={`${station.id}-${line.id}-${line.color}`}
                            className="transfer-chip"
                            style={{ ['--transfer-color' as string]: line.color }}
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
                      aria-label={`编辑 ${station.chName}`}
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
    </section>
  );
}
