// Horizontal swipe gesture on touch devices and the slide animation of a step: a quick,
// mostly horizontal finger move turns into a step to the previous (−1) / next (+1) item,
// like turning a page.
// A swipe that starts in a horizontally scrollable area (a wide staff, the fingering
// grid) is left to the scrolling.

export const SWIPE_MIN_DISTANCE_PX = 60;   // shorter moves are taps or jitter
export const SWIPE_MAX_DURATION_MS = 700;  // slower moves are reading / dragging
export const SWIPE_DIRECTION_RATIO = 2;    // horizontal at least twice the vertical move

// Step of a finger move from `start` to `end` ({ x, y, time }): +1 for a swipe to the
// left (next, the page turns forward), −1 for a swipe to the right (previous), 0 when
// the move is too short, too slow or not horizontal enough.
export function swipeStep(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const tooShort = Math.abs(dx) < SWIPE_MIN_DISTANCE_PX;
  const tooSlow = end.time - start.time > SWIPE_MAX_DURATION_MS;
  const notHorizontal = Math.abs(dx) < SWIPE_DIRECTION_RATIO * Math.abs(dy);
  if (tooShort || tooSlow || notHorizontal) return 0;

  return dx < 0 ? 1 : -1;
}

// True when `target` or one of its ancestors up to `root` scrolls horizontally.
export function insideHorizontalScroll(target, root) {
  for (let el = target; el && el !== root; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 1) {
      const overflowX = getComputedStyle(el).overflowX;
      if (overflowX === 'auto' || overflowX === 'scroll') return true;
    }
  }

  return false;
}

// Calls onStep(−1 | +1) for every single-finger horizontal swipe on `element`
// (outside horizontally scrollable areas and outside elements matching ignoreSelector,
// which have a swipe of their own).
export function initSwipeGesture(element, onStep, { ignoreSelector = null } = {}) {
  let start = null;

  element.addEventListener('touchstart', (event) => {
    const touch = event.touches[0];
    const ignored = ignoreSelector && event.target.closest?.(ignoreSelector);
    const skip = event.touches.length !== 1 || ignored || insideHorizontalScroll(event.target, element);
    start = skip ? null : { x: touch.clientX, y: touch.clientY, time: event.timeStamp };
  }, { passive: true });

  element.addEventListener('touchend', (event) => {
    if (!start) return;
    const touch = event.changedTouches[0];
    const step = swipeStep(start, { x: touch.clientX, y: touch.clientY, time: event.timeStamp });
    start = null;
    if (step !== 0) onStep(step);
  }, { passive: true });

  element.addEventListener('touchcancel', () => { start = null; }, { passive: true });
}

export const SLIDE_DURATION_MS = 220;
export const SLIDE_OFFSET_PX = 40;

// Keyframes of the content sliding in after a step: the next item comes from the right
// (+1), the previous one from the left (−1), like a turned page.
export function slideInKeyframes(step) {
  const offset = step > 0 ? SLIDE_OFFSET_PX : -SLIDE_OFFSET_PX;

  return [
    { transform: `translateX(${offset}px)`, opacity: 0 },
    { transform: 'translateX(0)', opacity: 1 },
  ];
}

// Short slide-in animation of the elements after a step (−1 / +1). Skipped when the
// user prefers reduced motion or the browser lacks the Web Animations API.
export function playSlideIn(elements, step) {
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;
  const keyframes = slideInKeyframes(step);
  for (const el of elements) {
    if (el?.animate) el.animate(keyframes, { duration: SLIDE_DURATION_MS, easing: 'ease-out' });
  }
}
