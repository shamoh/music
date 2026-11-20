import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { swipeStep, insideHorizontalScroll, initSwipeGesture, slideInKeyframes, playSlideIn, SWIPE_MIN_DISTANCE_PX, SWIPE_MAX_DURATION_MS, SLIDE_OFFSET_PX, SLIDE_DURATION_MS } from '../docs/js/swipe-gesture.js';

const at = (x, y, time = 0) => ({ x, y, time });

describe('swipeStep', () => {
  it('a swipe to the left goes to the next item', () => {
    assert.equal(swipeStep(at(300, 100), at(150, 110, 200)), 1);
  });
  it('a swipe to the right goes to the previous item', () => {
    assert.equal(swipeStep(at(100, 100), at(250, 90, 200)), -1);
  });
  it('ignores short moves (taps)', () => {
    assert.equal(swipeStep(at(100, 100), at(100 + SWIPE_MIN_DISTANCE_PX - 1, 100, 100)), 0);
  });
  it('ignores slow moves', () => {
    assert.equal(swipeStep(at(300, 100), at(100, 100, SWIPE_MAX_DURATION_MS + 1)), 0);
  });
  it('ignores mostly vertical moves (page scrolling)', () => {
    assert.equal(swipeStep(at(300, 100), at(200, 200, 200)), 0);
    assert.equal(swipeStep(at(300, 100), at(200, 160, 200)), 0);
  });
});

// Element stand-in: scroll sizes, overflow-x and a parent
function fakeElement({ scrollWidth = 100, clientWidth = 100, overflowX = 'visible', parent = null } = {}) {
  return { scrollWidth, clientWidth, overflowX, parentElement: parent };
}

function withComputedStyle(run) {
  const original = globalThis.getComputedStyle;
  globalThis.getComputedStyle = (el) => ({ overflowX: el.overflowX });
  try {
    run();
  } finally {
    globalThis.getComputedStyle = original;
  }
}

describe('insideHorizontalScroll', () => {
  it('detects a scrollable ancestor below the root', () => {
    withComputedStyle(() => {
      const root = fakeElement();
      const staff = fakeElement({ scrollWidth: 900, clientWidth: 360, overflowX: 'auto', parent: root });
      const note = fakeElement({ parent: staff });
      assert.equal(insideHorizontalScroll(note, root), true);
    });
  });
  it('ignores an overflow-auto area that fits (nothing to scroll)', () => {
    withComputedStyle(() => {
      const root = fakeElement();
      const staff = fakeElement({ scrollWidth: 360, clientWidth: 360, overflowX: 'auto', parent: root });
      assert.equal(insideHorizontalScroll(staff, root), false);
    });
  });
  it('ignores clipped content (overflow hidden) and stops at the root', () => {
    withComputedStyle(() => {
      const outer = fakeElement({ scrollWidth: 900, clientWidth: 360, overflowX: 'auto' });
      const root = fakeElement({ parent: outer });
      const label = fakeElement({ scrollWidth: 200, clientWidth: 100, overflowX: 'hidden', parent: root });
      assert.equal(insideHorizontalScroll(label, root), false);
    });
  });
});

describe('initSwipeGesture', () => {
  function fakeSwipeArea() {
    const listeners = {};
    const area = fakeElement();
    area.addEventListener = (type, fn) => { listeners[type] = fn; };
    area.touch = (type, { x, y, time, fingers = 1, target = area }) => {
      const touch = { clientX: x, clientY: y };
      listeners[type]({ target, timeStamp: time, touches: Array(fingers).fill(touch), changedTouches: [touch] });
    };
    return area;
  }

  it('reports a swipe and ignores multi-finger touches', () => {
    withComputedStyle(() => {
      const area = fakeSwipeArea();
      const steps = [];
      initSwipeGesture(area, (step) => steps.push(step));
      area.touch('touchstart', { x: 300, y: 100, time: 0 });
      area.touch('touchend', { x: 100, y: 100, time: 200 });
      area.touch('touchstart', { x: 300, y: 100, time: 1000, fingers: 2 });
      area.touch('touchend', { x: 100, y: 100, time: 1200 });
      assert.deepEqual(steps, [1]);
    });
  });
  it('leaves swipes on an element with its own swipe (ignoreSelector) to it', () => {
    withComputedStyle(() => {
      const area = fakeSwipeArea();
      const switcher = { ...fakeElement({ parent: area }), closest: (sel) => (sel === '#type-nav' ? switcher : null) };
      const steps = [];
      initSwipeGesture(area, (step) => steps.push(step), { ignoreSelector: '#type-nav' });
      area.touch('touchstart', { x: 300, y: 100, time: 0, target: switcher });
      area.touch('touchend', { x: 100, y: 100, time: 200, target: switcher });
      assert.deepEqual(steps, []);
    });
  });
  it('leaves swipes in a scrollable staff to the scrolling', () => {
    withComputedStyle(() => {
      const area = fakeSwipeArea();
      const staff = fakeElement({ scrollWidth: 900, clientWidth: 360, overflowX: 'auto', parent: area });
      const steps = [];
      initSwipeGesture(area, (step) => steps.push(step));
      area.touch('touchstart', { x: 100, y: 100, time: 0, target: staff });
      area.touch('touchend', { x: 300, y: 100, time: 200, target: staff });
      assert.deepEqual(steps, []);
    });
  });
});

describe('slideInKeyframes', () => {
  it('the next item slides in from the right, the previous one from the left', () => {
    assert.equal(slideInKeyframes(1)[0].transform, `translateX(${SLIDE_OFFSET_PX}px)`);
    assert.equal(slideInKeyframes(-1)[0].transform, `translateX(${-SLIDE_OFFSET_PX}px)`);
    assert.deepEqual(slideInKeyframes(1)[1], { transform: 'translateX(0)', opacity: 1 });
  });
});

describe('playSlideIn', () => {
  const animated = () => {
    const el = { calls: [] };
    el.animate = (keyframes, options) => el.calls.push({ keyframes, options });
    return el;
  };

  function withReducedMotion(reduce, run) {
    const original = globalThis.matchMedia;
    globalThis.matchMedia = () => ({ matches: reduce });
    try {
      run();
    } finally {
      globalThis.matchMedia = original;
    }
  }

  it('animates every element and skips missing ones', () => {
    withReducedMotion(false, () => {
      const a = animated();
      const b = animated();
      playSlideIn([a, null, b], 1);
      assert.equal(a.calls.length, 1);
      assert.equal(b.calls.length, 1);
      assert.equal(a.calls[0].options.duration, SLIDE_DURATION_MS);
    });
  });
  it('does nothing when the user prefers reduced motion', () => {
    withReducedMotion(true, () => {
      const a = animated();
      playSlideIn([a], -1);
      assert.equal(a.calls.length, 0);
    });
  });
});
