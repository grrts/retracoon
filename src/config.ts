// Logical resolution for a landscape screen. Height is fixed; width stretches to fit
// wide phones without letterboxing. Everything is drawn in this pixel grid and scaled up.
const ratio = window.innerWidth > window.innerHeight ? window.innerWidth / Math.max(1, window.innerHeight) : 16 / 9;
export const H = 216;
export const W = Math.round(Math.min(480, Math.max(360, H * ratio)));
export const GROUND_Y = 160;
export const IS_TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
