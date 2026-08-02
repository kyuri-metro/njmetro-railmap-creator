import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  APP_LAYOUT_FIXED_SIDEBAR_MIN_WIDTH_PX,
  COLUMNS_STACK_MAX_WIDTH_PX,
  COMPACT_MAX_WIDTH_PX,
  DIALOG_NARROW_MAX_WIDTH_PX,
  NARROW_MAX_WIDTH_PX,
} from './breakpoints';

const stylesDir = join(dirname(fileURLToPath(import.meta.url)), '../styles');

const readAllStylesCss = () =>
  readdirSync(stylesDir)
    .filter((name) => name.endsWith('.css'))
    .map((name) => readFileSync(join(stylesDir, name), 'utf8'))
    .join('\n');

describe('breakpoints sync with CSS', () => {
  it('matches width literals used in src/styles', () => {
    const css = readAllStylesCss();

    expect(css).toContain(`max-width: ${COMPACT_MAX_WIDTH_PX}px`);
    expect(css).toContain(`min-width: ${COMPACT_MAX_WIDTH_PX + 1}px`);
    expect(css).toContain(`max-width: ${NARROW_MAX_WIDTH_PX}px`);
    expect(css).toContain(`max-width: ${COLUMNS_STACK_MAX_WIDTH_PX}px`);
    expect(css).toContain(`max-width: ${DIALOG_NARROW_MAX_WIDTH_PX}px`);
    expect(css).toContain(`min-width: ${APP_LAYOUT_FIXED_SIDEBAR_MIN_WIDTH_PX}px`);
  });
});
