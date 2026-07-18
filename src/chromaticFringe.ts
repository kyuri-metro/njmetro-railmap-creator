import { initChromaticFringe } from '@umamichi-ui/chromatic-fringe/init';

const BUTTON_SELECTOR = [
  '.outline-button',
  '.primary-button',
  '.secondary-button',
  '.ghost-button',
  '.danger-button',
  '.icon-button',
].join(', ');

/** App wiring for @umamichi-ui/chromatic-fringe (parity with umamichi.moe). */
export function initAppChromaticFringe(): void {
  initChromaticFringe({
    buttonSelector: BUTTON_SELECTOR,
    skipClosest: '.app-topbar',
    fadeBorderSelector: '.outline-button',
    depths: {
      dropdown: 1.35,
      button: 0.65,
      default: 1,
    },
  });
}
