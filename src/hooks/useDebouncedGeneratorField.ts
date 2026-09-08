import { startTransition, useEffect, useRef, useState } from 'react';

export const CONTROL_DEBOUNCE_MS = 160;

/** 草稿已由 transformInput 过滤为纯数字串；空串按 0。 */
export const parseTotalLengthDraft = (raw: string) => Number(raw);

export const normalizeLineIdDraft = (raw: string) => raw.trim().toUpperCase();

export type UseDebouncedGeneratorFieldOptions<T> = {
  committedValue: T;
  formatCommitted: (value: T) => string;
  parse: (raw: string) => T;
  onCommit: (value: T) => void;
  transformInput?: (raw: string) => string;
  debounceMs?: number;
};

export type DebouncedGeneratorField = {
  draft: string;
  onDraftChange: (raw: string) => void;
  onBlur: () => void;
  resetFromCommitted: (value: string) => void;
};

export function useDebouncedGeneratorField<T>({
  committedValue,
  formatCommitted,
  parse,
  onCommit,
  transformInput,
  debounceMs = CONTROL_DEBOUNCE_MS,
}: UseDebouncedGeneratorFieldOptions<T>): DebouncedGeneratorField {
  const [draft, setDraft] = useState(() => formatCommitted(committedValue));
  const dirtyRef = useRef(false);
  const debounceRef = useRef(0);

  const formatCommittedRef = useRef(formatCommitted);
  const parseRef = useRef(parse);
  const onCommitRef = useRef(onCommit);
  const transformInputRef = useRef(transformInput);
  const committedRef = useRef(committedValue);

  formatCommittedRef.current = formatCommitted;
  parseRef.current = parse;
  onCommitRef.current = onCommit;
  transformInputRef.current = transformInput;
  committedRef.current = committedValue;

  useEffect(() => {
    if (!dirtyRef.current) {
      setDraft(formatCommittedRef.current(committedValue));
    }
  }, [committedValue]);

  const applyParsed = (raw: string) => {
    const next = parseRef.current(raw);

    if (next !== committedRef.current) {
      startTransition(() => {
        onCommitRef.current(next);
      });
    }

    dirtyRef.current = false;
    setDraft(formatCommittedRef.current(next));
  };

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      applyParsed(draft);
    }, debounceMs);

    return () => {
      window.clearTimeout(debounceRef.current);
    };
  }, [draft, debounceMs]);

  return {
    draft,
    onDraftChange: (raw: string) => {
      dirtyRef.current = true;
      const transform = transformInputRef.current;
      setDraft(transform ? transform(raw) : raw);
    },
    onBlur: () => {
      window.clearTimeout(debounceRef.current);
      applyParsed(draft);
    },
    resetFromCommitted: (value: string) => {
      dirtyRef.current = false;
      setDraft(value);
    },
  };
}
