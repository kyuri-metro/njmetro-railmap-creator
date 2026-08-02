import { startTransition, useEffect, useRef, useState } from 'react';

export const CONTROL_DEBOUNCE_MS = 160;

export const parseTotalLengthDraft = (raw: string) => {
  const trimmed = raw.trim();

  if (trimmed === '') {
    return 0;
  }

  const n = Math.trunc(Number(trimmed));

  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export const normalizeLineIdDraft = (raw: string) => raw.trim().toUpperCase();

export const normalizeIdColorDraft = (raw: string) => {
  const v = raw.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
    return v.toLowerCase();
  }

  return null;
};

export const hexColorsEqual = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export type UseDebouncedGeneratorFieldOptions<T> = {
  committedValue: T;
  formatCommitted: (value: T) => string;
  parse: (raw: string) => T | null;
  onCommit: (value: T) => void;
  shouldCommit?: (next: T, committed: T) => boolean;
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
  shouldCommit = (next, committed) => next !== committed,
  transformInput,
  debounceMs = CONTROL_DEBOUNCE_MS,
}: UseDebouncedGeneratorFieldOptions<T>): DebouncedGeneratorField {
  const [draft, setDraft] = useState(() => formatCommitted(committedValue));
  const draftRef = useRef(draft);
  const dirtyRef = useRef(false);
  const debounceRef = useRef(0);

  const formatCommittedRef = useRef(formatCommitted);
  const parseRef = useRef(parse);
  const onCommitRef = useRef(onCommit);
  const shouldCommitRef = useRef(shouldCommit);
  const transformInputRef = useRef(transformInput);
  const committedRef = useRef(committedValue);

  formatCommittedRef.current = formatCommitted;
  parseRef.current = parse;
  onCommitRef.current = onCommit;
  shouldCommitRef.current = shouldCommit;
  transformInputRef.current = transformInput;
  committedRef.current = committedValue;
  draftRef.current = draft;

  useEffect(() => {
    if (!dirtyRef.current) {
      setDraft(formatCommittedRef.current(committedValue));
    }
  }, [committedValue]);

  const applyParsed = (raw: string) => {
    const next = parseRef.current(raw);
    const committed = committedRef.current;

    if (next !== null && shouldCommitRef.current(next, committed)) {
      startTransition(() => {
        onCommitRef.current(next);
      });
    }

    dirtyRef.current = false;

    if (next !== null) {
      setDraft(formatCommittedRef.current(next));
    } else {
      setDraft(formatCommittedRef.current(committed));
    }
  };

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      applyParsed(draftRef.current);
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
      applyParsed(draftRef.current);
    },
    resetFromCommitted: (value: string) => {
      dirtyRef.current = false;
      setDraft(value);
    },
  };
}
