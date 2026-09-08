import { startTransition, useEffect, useRef } from 'react';
import type { DebouncedGeneratorField } from '../hooks/useDebouncedGeneratorField';
import { useAppDispatch } from '../hooks';
import {
  setDirection,
  setIdColor,
  setIdTextColor,
  setShowStationTypeIcons,
  setTrainType,
  setUseCapsuleTransferMarkers,
  type GeneratorState,
} from '../features/generatorSlice';
import { TRAIN_TYPE_OPTIONS, type TrainType } from '../trainTypeLayout';

type LineColorFieldProps = Readonly<{
  label: string;
  value: string;
  onCommit: (value: string) => void;
}>;

/**
 * 颜色输入保持非受控：拖动取色时由浏览器自行更新色块，不引起 React 渲染；
 * 仅在取色结束（原生 change）时提交一次，避免每个中间色都重算预览与主题。
 */
const LineColorField = ({ label, value, onCommit }: LineColorFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current!.value = value;
  }, [value]);

  useEffect(() => {
    const input = inputRef.current!;
    const commit = () => {
      if (input.value !== value) {
        startTransition(() => {
          onCommit(input.value);
        });
      }
    };

    input.addEventListener('change', commit);
    return () => input.removeEventListener('change', commit);
  }, [onCommit, value]);

  return (
    <label className="field-label">
      <span>{label}</span>
      <input ref={inputRef} type="color" defaultValue={value} />
    </label>
  );
};

export type GeneratorSettingsPanelProps = {
  generator: GeneratorState;
  totalLengthField: DebouncedGeneratorField;
  lineIdField: DebouncedGeneratorField;
};

export const GeneratorSettingsPanel = ({
  generator,
  totalLengthField,
  lineIdField,
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
        <LineColorField
          label="线路标识色"
          value={generator.idColor}
          onCommit={(value) => dispatch(setIdColor(value))}
        />
        <LineColorField
          label="线路编号字体色"
          value={generator.idTextColor}
          onCommit={(value) => dispatch(setIdTextColor(value))}
        />
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
        <label className="field-label field-label-checkbox">
          <input
            type="checkbox"
            checked={generator.useCapsuleTransferMarkers}
            onChange={(event) => {
              startTransition(() => {
                dispatch(setUseCapsuleTransferMarkers(event.target.checked));
              });
            }}
          />
          <span>非当前换乘中间站使用胶囊标记</span>
        </label>
      </div>
    </section>
  );
};
