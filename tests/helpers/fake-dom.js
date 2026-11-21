// Stand-ins for the browser objects the tests need: just enough of the DOM and of
// localStorage for the code under test, without a real browser.

// In-memory localStorage: getItem / setItem, the stored values in `items`.
export function memoryStorage(initial = {}) {
  const items = { ...initial };

  return {
    items,
    getItem: (key) => items[key] ?? null,
    setItem: (key, value) => { items[key] = String(value); },
  };
}

// localStorage that is blocked (private mode, disabled site data): every access throws.
export function blockedStorage() {
  const blocked = () => { throw new Error('storage blocked'); };

  return { getItem: blocked, setItem: blocked };
}

// Object that collects event listeners by type: addEventListener, dispatch(type, event),
// click(event) and the listeners in `listeners`. `properties` are merged in.
export function fakeEventTarget(properties = {}) {
  const listeners = {};

  return {
    listeners,
    addEventListener(type, listener) { (listeners[type] ??= []).push(listener); },
    dispatch(type, event = {}) { (listeners[type] ?? []).forEach((listener) => listener(event)); },
    click(event = {}) { this.dispatch('click', event); },
    listenerCount(type) { return listeners[type]?.length ?? 0; },
    ...properties,
  };
}

// Element that collects its appended children in `children`; `properties` are merged in.
export function fakeContainer(properties = {}) {
  return {
    children: [],
    appendChild(child) { this.children.push(child); },
    ...properties,
  };
}

// Document: getElementById from `elements` (id → element), createElement (a fakeContainer
// with tagName), createTextNode ({ text }), document-level listeners (fakeEventTarget) and
// CSS variables set on documentElement collected in `cssVariables`.
export function fakeDocument({ elements = {} } = {}) {
  const cssVariables = {};

  return fakeEventTarget({
    elements,
    cssVariables,
    documentElement: { style: { setProperty: (name, value) => { cssVariables[name] = value; } } },
    getElementById: (id) => elements[id] ?? null,
    createElement: (tagName) => fakeContainer({ tagName }),
    createTextNode: (text) => ({ text }),
  });
}

// Gear button and panel of the settings menu (#settings-toggle / #settings-panel):
// the button records its attributes in `attrs` and whether it got the focus.
export function fakeSettingsMenu() {
  const toggle = fakeEventTarget({
    dataset: {},
    attrs: {},
    focused: false,
    setAttribute(name, value) { this.attrs[name] = value; },
    focus() { this.focused = true; },
  });
  const panel = { hidden: true };

  return { toggle, panel, elements: { 'settings-toggle': toggle, 'settings-panel': panel } };
}
