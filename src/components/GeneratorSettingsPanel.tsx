import { startTransition } from 'react';
import type { DebouncedGeneratorField } from '../hooks/useDebouncedGeneratorField';
import { useAppDispatch } from '../hooks';
import { setDirection, setShowStationTypeIcons, setTrainType, type GeneratorState } from '../features/generatorSlice';
import { TRAIN_TYPE_OPTIONS, type TrainType } from '../trainTypeLayout';

export type GeneratorSettingsPanelProps = {
  generator: GeneratorState;
  totalLengthField: DebouncedGeneratorField;
  lineIdField: DebouncedGeneratorField;
  idColorField: DebouncedGeneratorField;
  idTextColorField: DebouncedGeneratorField;
};

export const GeneratorSettingsPanel = ({
  generator,
  totalLengthField,
  lineIdField,
  idColorField,
  idTextColorField,
}: GeneratorSettingsPanelProps) => {
  const dispatch = useAppDispatch();

  return (
    <section className="panel">
      <h2 className="site-content-heading">生成设置</h2>
      <div className="form-scope form-grid generator-settings-grid">
        <label className="field-label">
          <span>总长（px）</span>
          <input
            className="text-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            value={totalLengthField.draft}
            onChange={(event) => totalLengthField.onDraftChange(event.target.value)}
            onBlur={totalLengthField.onBlur}
          />
        </label>
        <label className="field-label">
          <span>列车行进方向</span>
          <select
            className="select-input"
            value={generator.direction}
            onChange={(event) => {
              startTransition(() => {
                dispatch(setDirection(event.target.value as 'l' | 'r'));
              });
            }}
          >
            <option value="l">l</option>
            <option value="r">r</option>
          </select>
        </label>
        <label className="field-label">
          <span>车型</span>
          <select
            className="select-input"
            value={generator.trainType}
            onChange={(event) => {
              startTransition(() => {
                dispatch(setTrainType(event.target.value as TrainType));
              });
            }}
          >
            {TRAIN_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          <span>线路编号</span>
          <input
            className="text-input"
            type="text"
            value={lineIdField.draft}
            onChange={(event) => lineIdField.onDraftChange(event.target.value)}
            onBlur={lineIdField.onBlur}
          />
        </label>
        <label className="field-label">
          <span>线路标识色</span>
          <input
            type="color"
            value={idColorField.draft}
            onChange={(event) => idColorField.onDraftChange(event.target.value)}
            onBlur={idColorField.onBlur}
          />
        </label>
        <label className="field-label">
          <span>线路编号字体色</span>
          <input
            type="color"
            value={idTextColorField.draft}
            onChange={(event) => idTextColorField.onDraftChange(event.target.value)}
            onBlur={idTextColorField.onBlur}
          />
        </label>
        <label className="field-label field-label-checkbox">
          <input
            type="checkbox"
            checked={generator.showStationTypeIcons}
            onChange={(event) => {
              startTransition(() => {
                dispatch(setShowStationTypeIcons(event.target.checked));
              });
            }}
          />
          <span>在火车站或机场站名前添加图标（测试）</span>
        </label>
      </div>
    </section>
  );
};
