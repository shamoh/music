// Navigation between scales shared by the pages that show one scale (Stupnice, the
// saxophone range): the sticky heading "‹ previous | current | next ›", Shift + arrow
// keys, swipe gestures on touch devices and clicks on the ‹ / › links. The pages supply
// their scale list and labels and switch the scale themselves (onScaleStep / onVariantStep).

import { adjacentScales } from './music.js';
import { initPageKeys, isFormField, isPageKey, navigationKey } from './page-keys.js';
import { initSwipeGesture } from './swipe-gesture.js';

const NAV_ARIA_LABEL = { prev: 'Předchozí stupnice', next: 'Další stupnice' };

// Parts of a ‹ / › link label: "‹ a♯ moll", with the group's name when the target is in
// another group than the current scale: "‹ [Moll] a♯ moll" / "[Celotónové] C celotónová ›".
// Returns [{ text, group: true | undefined }].
export function navLabelParts({ target, current, side, scaleLabel, groupLabel }) {
  const parts = [];
  if (side === 'prev') parts.push({ text: '‹ ' });
  if (current && target.type !== current.type) parts.push({ text: groupLabel(target.type), group: true }, { text: ' ' });
  parts.push({ text: scaleLabel(target) });
  if (side === 'next') parts.push({ text: ' ›' });

  return parts;
}

function navLabelNodes(options) {
  return navLabelParts(options).map((part) => (part.group
    ? Object.assign(document.createElement('span'), { className: 'scale-nav-group', textContent: part.text })
    : part.text));
}

// Draws the heading of `current` (null: no scale — only emptyTitle, without links).
// heading: { root, prev, title, next } elements; scales: the scales offered (select
// order and filters), grouped by type in typeOrder. The end of a group links on to the
// neighbouring group; the ends of the list leave the link greyed out. Each of the three
// sections gets a fixed width — the widest label within the group, including the links
// into the neighbouring groups — so switching scales within a group never moves the links.
export function renderScaleNavHeading(heading, { current, scales, typeOrder, scaleLabel, groupLabel, href, emptyTitle = '' }) {
  const { prev, next } = current ? adjacentScales(scales, current.id, typeOrder) : { prev: null, next: null };
  const labels = { scaleLabel, groupLabel };

  heading.title.textContent = current ? scaleLabel(current) : emptyTitle;
  fillNavItem({ el: heading.prev, target: prev, current, side: 'prev', href, ...labels });
  fillNavItem({ el: heading.next, target: next, current, side: 'next', href, ...labels });
  heading.root.classList.toggle('single', !current);
  if (!current) {
    for (const el of [heading.prev, heading.title, heading.next]) el.style.width = '';
    fitRowFilters(heading.root.parentNode);
    return;
  }

  // Every link target possible within this group: its scales and the neighbouring groups' ends
  const group = scales.filter((s) => s.type === current.type);
  const groupEnds = [adjacentScales(scales, group[0].id, typeOrder).prev, adjacentScales(scales, group[group.length - 1].id, typeOrder).next];
  const targets = [...group, ...groupEnds.filter(Boolean)];
  const linkFillers = (side) => targets.map((target) => (probe) => probe.replaceChildren(...navLabelNodes({ target, current, side, ...labels })));
  heading.prev.style.width  = maxContentWidth(heading.prev, linkFillers('prev')) + 'px';
  heading.title.style.width = maxContentWidth(heading.title, group.map((s) => (probe) => { probe.textContent = scaleLabel(s); })) + 'px';
  heading.next.style.width  = maxContentWidth(heading.next, linkFillers('next')) + 'px';

  // Narrow screen: the current scale on its own row, previous / next below it. Depends
  // only on the group's widest labels, so it doesn't flip while browsing the group.
  heading.root.classList.remove('stacked');
  heading.root.classList.toggle('stacked', heading.root.scrollWidth > heading.root.parentNode.clientWidth);
  fitRowFilters(heading.root.parentNode);
}

// The filters of the sticky row stay in it only while they fit next to the heading;
// otherwise they collapse behind the "Filtry" toggle (class "filters-collapsed"), so the
// row stays low. Measured with the filters laid out in the row; rendering the heading
// (also on resize) measures again. Filters that no longer collapse are not "open".
export function fitRowFilters(row) {
  const filters = row?.querySelector?.('.scale-nav-filters');
  const heading = row?.querySelector?.('.scale-heading');
  if (!filters || !heading) return;
  // Until this first measurement the filters are laid out, but invisible (no flash)
  row.classList.remove('filters-pending');
  const wasOpen = row.classList.contains('filters-open');
  row.classList.remove('filters-collapsed', 'filters-open');
  const collapse = filtersWrapped(heading.getBoundingClientRect(), filters.getBoundingClientRect());
  row.classList.toggle('filters-collapsed', collapse);
  setFiltersOpen(row, collapse && wasOpen);
}

// True when the filters (bounding rect) start below the heading's line — they wrapped.
export function filtersWrapped(headingRect, filtersRect) {
  return filtersRect.top >= headingRect.bottom - 1;
}

// Number of switched off filters (chips without the "active" class).
export function inactiveFilterCount(chips) {
  return [...chips].filter((chip) => !chip.classList.contains('active')).length;
}

function fillNavItem({ el, target, current, side, href, scaleLabel, groupLabel }) {
  el.replaceChildren();
  el.classList.toggle('disabled', !target);
  if (!target) {
    el.textContent = side === 'prev' ? '‹' : '›';
    return;
  }
  const a = Object.assign(document.createElement('a'), { href: href(target) });
  a.dataset.step = side === 'prev' ? '-1' : '1';
  a.append(...navLabelNodes({ target, current, side, scaleLabel, groupLabel }));
  const group = current && target.type !== current.type ? `${groupLabel(target.type)} · ` : '';
  a.setAttribute('aria-label', `${NAV_ARIA_LABEL[side]}: ${group}${scaleLabel(target)}`);
  el.appendChild(a);
}

// Widest rendered width (px, including the element's padding) of the contents the
// fillers put into el (filler(probe) fills a probe). Measured with an invisible clone of el.
function maxContentWidth(el, fillers) {
  const probe = el.cloneNode(false);
  probe.removeAttribute('id');
  Object.assign(probe.style, { position: 'absolute', visibility: 'hidden', width: 'auto', whiteSpace: 'nowrap' });
  el.parentNode.appendChild(probe);
  let max = 0;
  for (const fill of fillers) {
    fill(probe);
    max = Math.max(max, probe.getBoundingClientRect().width);
  }
  probe.remove();

  return Math.ceil(max);
}

// Switching scales and variants:
// - Shift+← / Shift+→ and the ‹ / › links in heading.root → onScaleStep(−1 | +1)
// - Shift+↑ / Shift+↓ → onVariantStep(−1 | +1) (only when given)
// - swipe to the left / right on swipeArea → onScaleStep(+1 | −1), on variantSwipeArea
//   (within swipeArea) → onVariantStep instead
// - stickyRow (position: sticky; top: -1px) gets the class "stuck" while stuck at the top;
//   its filters collapse behind the "Filtry" toggle when they don't fit (fitRowFilters,
//   initFilterToggle); its "Vše zapnout" button → onEnableAllFilters()
// Form fields keep their keys; a link click with a modifier opens it as usual.
export function initScaleNavigation({ heading, stickyRow, swipeArea, variantSwipeArea = null, onScaleStep, onVariantStep = null, onEnableAllFilters = null, doc = document }) {
  initPageKeys((event) => {
    const key = navigationKey(event);
    if (!key || isFormField(event.target)) return;
    const handler = key.axis === 'scale' ? onScaleStep : onVariantStep;
    if (!handler) return;
    event.preventDefault();   // Shift+arrows don't extend a text selection or scroll
    handler(key.step);
  }, doc);

  heading.root.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-step]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onScaleStep(Number(link.dataset.step));
  });

  if (swipeArea) {
    const ignoreSelector = variantSwipeArea && onVariantStep ? `#${variantSwipeArea.id}` : null;
    initSwipeGesture(swipeArea, onScaleStep, { ignoreSelector });
    if (ignoreSelector) initSwipeGesture(variantSwipeArea, onVariantStep);
  }
  if (stickyRow) {
    initStickyRow(stickyRow);
    initFilterToggle(stickyRow, { doc, onEnableAllFilters });
  }
}

// When the filters of the sticky row collapse (fitRowFilters), the "Filtry" button shows /
// hides them (class "filters-open" on the row). Escape or a click outside them closes
// them; Escape then does nothing else (the window's capture phase sees it first).
// The button shows how many filters are switched off; while some are, the "Vše zapnout"
// button among the filters calls onEnableAllFilters.
export function initFilterToggle(row, { doc = document, win = globalThis, onEnableAllFilters = null } = {}) {
  const toggle = row.querySelector('.scale-nav-filters-toggle');
  if (!toggle) return;
  const reset = row.querySelector('.scale-nav-filters-reset');
  if (reset && onEnableAllFilters) reset.addEventListener('click', () => onEnableAllFilters());
  toggle.addEventListener('click', () => setFiltersOpen(row, !row.classList.contains('filters-open')));

  doc.addEventListener('click', (event) => {
    if (!row.classList.contains('filters-open')) return;
    if (event.target.closest?.('.scale-nav-filters, .scale-nav-filters-toggle')) return;
    setFiltersOpen(row, false);
  });
  win.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !row.classList.contains('filters-open') || !isPageKey(event, doc)) return;
    event.stopPropagation();
    setFiltersOpen(row, false);
  }, true);

  initFilterCount({ row, toggle, reset: onEnableAllFilters ? reset : null, doc });
}

function setFiltersOpen(row, open) {
  row.classList.toggle('filters-open', open);
  row.querySelector('.scale-nav-filters-toggle')?.setAttribute('aria-expanded', String(open));
}

// "Filtry ②": the number of switched off filters on the button, updated whenever a chip
// changes (the pages toggle the chips' "active" class themselves). The reset button
// ("Vše zapnout") is shown only while some filter is off.
function initFilterCount({ row, toggle, reset, doc }) {
  const chips = row.querySelectorAll('.scale-nav-filters .filter-chip');
  const badge = Object.assign(doc.createElement('span'), { className: 'scale-nav-filters-count' });
  toggle.insertBefore(badge, toggle.lastElementChild);
  const updateCount = () => {
    const count = inactiveFilterCount(chips);
    badge.textContent = String(count);
    badge.hidden = count === 0;
    if (reset) reset.hidden = count === 0;
    toggle.setAttribute('aria-label', count === 0 ? 'Filtry' : `Filtry, vypnuté: ${count}`);
  };
  updateCount();
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(updateCount).observe(row.querySelector('.scale-nav-filters'), { attributes: true, attributeFilter: ['class'], subtree: true });
  }
}

// The row sticks to the top of the window (CSS, top: -1px): once it is stuck, it is not
// fully visible and gets the class "stuck" (a dividing shadow).
function initStickyRow(row) {
  if (typeof IntersectionObserver === 'undefined') return;
  new IntersectionObserver(([observed]) => {
    row.classList.toggle('stuck', observed.intersectionRatio < 1 && observed.boundingClientRect.top < 0);
  }, { threshold: [1] }).observe(row);
}

// ─── Last shown scale (shared by both scale pages) ───────────────────────────

const LAST_SCALE_STORAGE_KEY = 'scales-last-scale';

export function savedLastScaleId(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(LAST_SCALE_STORAGE_KEY) ?? null;
  } catch (_) {
    return null;
  }
}

export function saveLastScaleId(scaleId, storage = globalThis.localStorage) {
  try {
    storage?.setItem(LAST_SCALE_STORAGE_KEY, scaleId);
  } catch (_) {}
}

// ─── Scale select ─────────────────────────────────────────────────────────────

// Appends an <optgroup> with the scales to the scale select; nothing for no scales.
// makeOption(scale) creates the <option> of one scale.
export function appendScaleOptionGroup(select, label, scales, makeOption, documentRef = document) {
  if (scales.length === 0) return;

  const group = documentRef.createElement('optgroup');
  group.label = label;
  scales.forEach((scale) => group.appendChild(makeOption(scale)));
  select.appendChild(group);
}
