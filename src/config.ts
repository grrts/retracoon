// Logical resolution. Width is fixed; height stretches a little to fill tall phones.
export const W = 180;
export const H = Math.round(Math.min(390, Math.max(320, (W * window.innerHeight) / Math.max(1, window.innerWidth))));
export const IS_TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
