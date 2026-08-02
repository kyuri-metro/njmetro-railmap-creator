import { useAppDispatch } from '../hooks';
import {
  setIdColor,
  setIdTextColor,
  setLineId,
  setTotalLength,
  type GeneratorState,
} from '../features/generatorSlice';
import {
  hexColorsEqual,
  normalizeIdColorDraft,
  normalizeLineIdDraft,
  parseTotalLengthDraft,
  useDebouncedGeneratorField,
  type DebouncedGeneratorField,
} from './useDebouncedGeneratorField';

export type GeneratorControlDrafts = {
  totalLength: DebouncedGeneratorField;
  lineId: DebouncedGeneratorField;
  idColor: DebouncedGeneratorField;
  idTextColor: DebouncedGeneratorField;
  syncFromGenerator: (state: GeneratorState) => void;
};

export function useGeneratorControlDrafts(generator: GeneratorState): GeneratorControlDrafts {
  const dispatch = useAppDispatch();

  const totalLength = useDebouncedGeneratorField({
    committedValue: generator.totalLength,
    formatCommitted: String,
    parse: parseTotalLengthDraft,
    onCommit: (value) => {
      dispatch(setTotalLength(value));
    },
    transformInput: (raw) => raw.replace(/\D/g, ''),
  });

  const lineId = useDebouncedGeneratorField({
    committedValue: generator.lineId,
    formatCommitted: (value) => value,
    parse: normalizeLineIdDraft,
    onCommit: (value) => {
      dispatch(setLineId(value));
    },
    transformInput: (raw) => raw.trim().toUpperCase(),
  });

  const idColor = useDebouncedGeneratorField({
    committedValue: generator.idColor,
    formatCommitted: (value) => value,
    parse: normalizeIdColorDraft,
    shouldCommit: (next, committed) => !hexColorsEqual(next, committed),
    onCommit: (value) => {
      dispatch(setIdColor(value));
    },
  });

  const idTextColor = useDebouncedGeneratorField({
    committedValue: generator.idTextColor,
    formatCommitted: (value) => value,
    parse: normalizeIdColorDraft,
    shouldCommit: (next, committed) => !hexColorsEqual(next, committed),
    onCommit: (value) => {
      dispatch(setIdTextColor(value));
    },
  });

  const syncFromGenerator = (state: GeneratorState) => {
    totalLength.resetFromCommitted(String(state.totalLength));
    lineId.resetFromCommitted(state.lineId);
    idColor.resetFromCommitted(state.idColor);
    idTextColor.resetFromCommitted(state.idTextColor);
  };

  return { totalLength, lineId, idColor, idTextColor, syncFromGenerator };
}
