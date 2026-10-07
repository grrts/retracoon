// Logical resolution for a landscape screen. Height is fixed; width stretches to fit
// wide phones without letterboxing.
const ratio = window.innerWidth > window.innerHeight ? window.innerWidth / Math.max(1, window.innerHeight) : 16 / 9;
export const H = 180;
export const W = Math.round(Math.min(400, Math.max(300, H * ratio)));
export const IS_TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
