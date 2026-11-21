import { initPageKeys, initUndoKey, isFormField, activatesOnKey } from './page-keys.js';

// ── Pure functions (exported for testing) ─────────────────────────────────────

export const RHYTHM_PATTERNS = [
  { id: '4/4', label: '4/4 — základní',      beats: 4, accents: [0]    },
  { id: '3/4', label: '3/4 — valčík',        beats: 3, accents: [0]    },
  { id: '2/4', label: '2/4 — pochod',        beats: 2, accents: [0]    },
  { id: '6/8', label: '6/8 — šestiosminový', beats: 6, accents: [0, 3] },
  { id: '5/4', label: '5/4 — složený',       beats: 5, accents: [0, 3] },
  { id: 'custom', label: 'Vlastní',           beats: null, accents: null },
];

// Keyboard: ←/→ change the tempo by 1 BPM, ↓/↑ by 5 BPM (Space starts / stops)
export const TEMPO_KEY_STEPS = { ArrowLeft: -1, ArrowRight: 1, ArrowDown: -5, ArrowUp: 5 };

// Keyboard: digits 1–6 pick the rhythm patterns in their order (4/4, 3/4, 2/4, 6/8,
// 5/4, custom). → pattern id, or null for other keys.
export function patternIdForKey(key) {
  const index = /^[1-9]$/.test(key) ? Number(key) - 1 : -1;

  return RHYTHM_PATTERNS[index]?.id ?? null;
}

// Keyboard (custom pattern): + (also = and the numpad +) adds a beat, − removes one.
// → +1 / -1, or null for other keys.
export function beatCountStepForKey(key) {
  if (key === '+' || key === '=') return 1;
  if (key === '-' || key === '−') return -1;

  return null;
}

// Keyboard (custom pattern): Shift + digit 1–8 toggles the accent of that beat. Uses the
// physical key (event.code): Shift + 1 types "!" on a US keyboard.
// → beat index (0-based), or null for other key presses.
export function accentBeatForKey(event) {
  const match = event.shiftKey && /^Digit([1-8])$/.exec(event.code ?? '');

  return match ? Number(match[1]) - 1 : null;
}

// Keyboard (saved rhythms list): ↑ / ↓ on a focused row move to the previous / next
// row; stays at the first / last one. → index of the row to focus.
export const ROW_KEY_STEPS = { ArrowUp: -1, ArrowDown: 1 };

export function adjacentRowIndex(index, step, count) {
  return Math.max(0, Math.min(count - 1, index + step));
}

// Keyboard (saved rhythms list): Delete on a focused row deletes it — also Backspace,
// the "delete" key of Mac keyboards.
export function isDeleteKey(key) {
  return key === 'Delete' || key === 'Backspace';
}

// Row to focus after the row at `index` was deleted and `count` rows are left: the one
// that took its place, or the new last one; -1 when the list is empty.
export function rowIndexAfterDelete(index, count) {
  return count === 0 ? -1 : Math.min(index, count - 1);
}

// Keyboard: T (either case) is the tap tempo key
export function isTapKey(key) {
  return key === 't' || key === 'T';
}

export function bpmToInterval(bpm) {
  return 60000 / bpm;
}

export function validateBpm(bpm) {
  const n = Number(bpm);
  if (!isFinite(n)) return 120;
  return Math.max(40, Math.min(240, Math.round(n)));
}

export function validateBeatCount(n) {
  const v = Math.round(Number(n));
  if (!isFinite(v)) return 4;
  return Math.max(2, Math.min(8, v));
}

export function isAccentedBeat(beatIndex, pattern) {
  if (!pattern || !Array.isArray(pattern.accents)) {
    return beatIndex === 0;
  }
  return pattern.accents.includes(beatIndex);
}

export function savedRhythmPatternLabel(saved) {
  if (saved.patternId === 'custom') {
    const n = saved.customBeats ?? 4;
    const acc = (saved.customAccents ?? []).map(i => i + 1);
    return acc.length ? `Vlastní ${n} [${acc.join(' ')}]` : `Vlastní ${n}`;
  }
  return saved.patternId;
}

// Name a rhythm is saved under when the name field is empty: pattern + tempo, e.g.
// "3/4 · 90 BPM", "Vlastní 5 [1 3] · 120 BPM".
export function defaultRhythmName({ patternId, customBeats, customAccents, bpm }) {
  return `${savedRhythmPatternLabel({ patternId, customBeats, customAccents })} · ${bpm} BPM`;
}

// Keyboard: S (either case) saves the current rhythm
export function isSaveKey(key) {
  return key === 's' || key === 'S';
}

export function upsertSavedRhythm(list, rhythm) {
  const idx = list.findIndex(r => r.name === rhythm.name);
  const next = idx >= 0 ? list.map((r, i) => (i === idx ? rhythm : r)) : [...list, rhythm];
  return next.sort((a, b) => a.name.localeCompare(b.name, 'cs'));
}

export function deleteSavedRhythm(list, name) {
  return list.filter(r => r.name !== name);
}

// ── Browser-only: audio engine + UI ──────────────────────────────────────────

if (typeof document !== 'undefined') {
  let state;
  let audioCtx = null;
  let schedulerTimer = null;
  let nextBeatTime = 0;
  let currentBeat = 0;
  let isPlaying = false;
  let activeDotTimer = null;
  const tapTimes = [];

  // ── Persistence ────────────────────────────────────────────────────────────

  function loadState() {
    try {
      return {
        bpm:          validateBpm(localStorage.getItem('metronome-bpm') ?? 100),
        patternId:    localStorage.getItem('metronome-pattern-id') ?? '4/4',
        customBeats:  validateBeatCount(localStorage.getItem('metronome-custom-beats') ?? 4),
        customAccents: JSON.parse(localStorage.getItem('metronome-custom-accents') ?? '[0]'),
      };
    } catch (_) {
      return { bpm: 100, patternId: '4/4', customBeats: 4, customAccents: [0] };
    }
  }

  function saveState() {
    localStorage.setItem('metronome-bpm', state.bpm);
    localStorage.setItem('metronome-pattern-id', state.patternId);
    localStorage.setItem('metronome-custom-beats', state.customBeats);
    localStorage.setItem('metronome-custom-accents', JSON.stringify(state.customAccents));
    updateRhythmNamePlaceholder();
  }

  // The empty name field shows the name the rhythm would be saved under
  function updateRhythmNamePlaceholder() {
    const nameInput = document.getElementById('metro-rhythm-name');
    if (nameInput) nameInput.placeholder = defaultRhythmName(state);
  }

  function loadSavedRhythms() {
    try {
      return JSON.parse(localStorage.getItem('metronome-saved-rhythms') ?? '[]');
    } catch (_) {
      return [];
    }
  }

  function persistSavedRhythms(list) {
    localStorage.setItem('metronome-saved-rhythms', JSON.stringify(list));
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getCurrentPattern() {
    const p = RHYTHM_PATTERNS.find(r => r.id === state.patternId);
    if (!p || p.id === 'custom') return { beats: state.customBeats, accents: state.customAccents };
    return p;
  }

  // ── Audio ──────────────────────────────────────────────────────────────────

  function initAudio() {
    if (!audioCtx) audioCtx = new AudioContext();
  }

  function scheduleClick(time, isAccent) {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.value = isAccent ? 1000 : 600;
    gain.gain.setValueAtTime(isAccent ? 1.0 : 0.55, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  function scheduler() {
    const pattern = getCurrentPattern();
    const beats   = pattern.beats ?? state.customBeats;
    const interval = 60 / state.bpm;
    while (nextBeatTime < audioCtx.currentTime + 0.1) {
      const beat = currentBeat;
      scheduleClick(nextBeatTime, isAccentedBeat(beat, pattern));
      const delay = (nextBeatTime - audioCtx.currentTime) * 1000;
      setTimeout(() => activateBeatDot(beat), Math.max(0, delay));
      currentBeat = (currentBeat + 1) % beats;
      nextBeatTime += interval;
    }
  }

  function startMetronome() {
    if (isPlaying) return;
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    isPlaying = true;
    currentBeat = 0;
    nextBeatTime = audioCtx.currentTime + 0.05;
    schedulerTimer = setInterval(scheduler, 25);
    updatePlayButton();
  }

  function stopMetronome() {
    if (!isPlaying) return;
    isPlaying = false;
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    clearActiveDot();
    updatePlayButton();
  }

  function restartIfPlaying() {
    if (!isPlaying) return;
    stopMetronome();
    startMetronome();
  }

  // ── UI: beat dots ──────────────────────────────────────────────────────────

  function renderBeatDots() {
    const container = document.getElementById('metro-beats');
    if (!container) return;
    container.replaceChildren();
    const pattern = getCurrentPattern();
    const beats = pattern.beats ?? state.customBeats;
    for (let i = 0; i < beats; i++) {
      const dot = document.createElement('span');
      dot.className = 'beat-dot' + (isAccentedBeat(i, pattern) ? ' is-accent' : '');
      dot.dataset.beat = i;
      container.appendChild(dot);
    }
  }

  function activateBeatDot(beatIndex) {
    clearTimeout(activeDotTimer);
    document.querySelectorAll('.beat-dot.is-active').forEach(d => d.classList.remove('is-active'));
    const dot = document.querySelector(`.beat-dot[data-beat="${beatIndex}"]`);
    if (dot) {
      dot.classList.add('is-active');
      activeDotTimer = setTimeout(() => dot.classList.remove('is-active'), 120);
    }
  }

  function clearActiveDot() {
    clearTimeout(activeDotTimer);
    document.querySelectorAll('.beat-dot.is-active').forEach(d => d.classList.remove('is-active'));
  }

  // ── UI: pattern chips ──────────────────────────────────────────────────────

  function renderPatternChips() {
    const container = document.getElementById('metro-patterns');
    if (!container) return;
    container.replaceChildren();
    for (const p of RHYTHM_PATTERNS) {
      const btn = document.createElement('button');
      btn.className = 'filter-chip' + (p.id === state.patternId ? ' active' : '');
      btn.textContent = p.label;
      btn.addEventListener('click', () => onPatternSelect(p.id));
      container.appendChild(btn);
    }
  }

  function onPatternSelect(id) {
    state.patternId = id;
    saveState();
    renderPatternChips();
    renderBeatDots();
    updateBpmDisplay();
    updateCustomSection();
    restartIfPlaying();
  }

  // ── UI: BPM ────────────────────────────────────────────────────────────────

  function updateBpmDisplay() {
    const display = document.getElementById('metro-bpm-display');
    const slider  = document.getElementById('metro-bpm-slider');
    if (display) display.textContent = state.bpm;
    if (slider)  slider.value = state.bpm;
  }

  function onBpmChange(value) {
    state.bpm = validateBpm(value);
    saveState();
    updateBpmDisplay();
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────

  // Space starts / stops, arrows change the tempo (TEMPO_KEY_STEPS), T taps the tempo,
  // 1–6 pick a rhythm pattern, S saves the rhythm. Keys stay with a focused control that handles them
  // itself (Space on a button or a saved-rhythm row, arrows on the tempo slider, typing
  // in the name field) and with the settings menu.
  function onMetronomeKey(e) {
    // Escape closes the undo notice (the deletion becomes final)
    if (e.key === 'Escape') {
      if (lastDeleted) hideUndoToast();
      return;
    }
    if (e.key === ' ') {
      if (activatesOnKey(e.target)) return;
      e.preventDefault();   // no page scroll
      togglePlay();
      return;
    }
    if (isFormField(e.target) || e.repeat && isTapKey(e.key)) return;
    if (onSavedRowKey(e)) return;
    if (state.patternId === 'custom' && onCustomPatternKey(e)) return;
    const step = TEMPO_KEY_STEPS[e.key];
    const patternId = patternIdForKey(e.key);
    if (step) {
      e.preventDefault();
      onBpmChange(state.bpm + step);
    } else if (isTapKey(e.key)) {
      onTap();
    } else if (isSaveKey(e.key)) {
      onSaveRhythm();
    } else if (patternId) {
      onPatternSelect(patternId);
    }
  }

  // Custom pattern only: +/− change the number of beats, Shift + 1–8 toggles an accent
  // (a beat beyond the current count is ignored). → true when the key was handled.
  function onCustomPatternKey(e) {
    const beatStep = beatCountStepForKey(e.key);
    const accentBeat = accentBeatForKey(e);
    if (beatStep) {
      e.preventDefault();
      setCustomBeats(state.customBeats + beatStep);
      return true;
    }
    if (accentBeat !== null) {
      e.preventDefault();
      if (accentBeat < state.customBeats) onAccentToggle(accentBeat);
      return true;
    }

    return false;
  }

  // Saved rhythms list: ↑ / ↓ on a focused row move the focus to the previous / next
  // row instead of changing the tempo, Delete (Backspace) deletes the row (undo from the
  // notice or Cmd+Z); Enter (or Space) on the row loads it (row's own keydown handler).
  // → true when the key was handled.
  function onSavedRowKey(e) {
    const row = e.target.closest?.('.metro-saved-row');
    if (!row) return false;
    const rows = [...document.querySelectorAll('.metro-saved-row')];
    const index = rows.indexOf(row);
    if (isDeleteKey(e.key)) {
      e.preventDefault();   // Backspace must not navigate back
      // Deleting re-renders the list: keep the keyboard in it
      if (onDeleteSavedRhythm(row.dataset.name)) {
        const left = [...document.querySelectorAll('.metro-saved-row')];
        left[rowIndexAfterDelete(index, left.length)]?.focus();
      }
      return true;
    }
    const step = ROW_KEY_STEPS[e.key];
    if (!step) return false;
    e.preventDefault();
    rows[adjacentRowIndex(index, step, rows.length)].focus();

    return true;
  }

  function togglePlay() {
    if (isPlaying) stopMetronome();
    else startMetronome();
  }

  // ── UI: play button ────────────────────────────────────────────────────────

  function updatePlayButton() {
    const btn = document.getElementById('metro-play');
    if (!btn) return;
    if (isPlaying) {
      btn.textContent = 'Pauza';
      btn.classList.add('is-playing');
    } else {
      btn.textContent = 'Spustit';
      btn.classList.remove('is-playing');
    }
  }

  // ── UI: custom section ─────────────────────────────────────────────────────

  function updateCustomSection() {
    const section = document.getElementById('metro-custom');
    if (!section) return;
    section.hidden = state.patternId !== 'custom';
    if (state.patternId === 'custom') renderAccentButtons();
  }

  function renderAccentButtons() {
    const beatsDisplay = document.getElementById('metro-custom-beats-display');
    const slider       = document.getElementById('metro-custom-beats');
    if (beatsDisplay) beatsDisplay.textContent = state.customBeats;
    if (slider)       slider.value = state.customBeats;
    const container = document.getElementById('metro-accent-buttons');
    if (!container) return;
    container.replaceChildren();
    for (let i = 0; i < state.customBeats; i++) {
      const btn = document.createElement('button');
      btn.className = 'beat-accent-btn' + (state.customAccents.includes(i) ? ' active' : '');
      btn.textContent = i + 1;
      btn.addEventListener('click', () => onAccentToggle(i));
      container.appendChild(btn);
    }
  }

  // Number of beats of the custom pattern (slider, +/− keys); accents beyond it are dropped
  function setCustomBeats(value) {
    state.customBeats = validateBeatCount(value);
    state.customAccents = state.customAccents.filter(i => i < state.customBeats);
    saveState();
    renderAccentButtons();
    renderBeatDots();
    restartIfPlaying();
  }

  function onAccentToggle(beatIndex) {
    if (state.customAccents.includes(beatIndex)) {
      state.customAccents = state.customAccents.filter(i => i !== beatIndex);
    } else {
      state.customAccents = [...state.customAccents, beatIndex].sort((a, b) => a - b);
    }
    saveState();
    renderAccentButtons();
    renderBeatDots();
  }

  // ── UI: saved rhythms ──────────────────────────────────────────────────────

  function renderSavedRhythms() {
    const container = document.getElementById('metro-saved-list');
    if (!container) return;

    const minVal = document.getElementById('metro-filter-min')?.value;
    const maxVal = document.getElementById('metro-filter-max')?.value;
    const minBpm = minVal !== '' && minVal != null ? parseInt(minVal) : -Infinity;
    const maxBpm = maxVal !== '' && maxVal != null ? parseInt(maxVal) : Infinity;

    const list = loadSavedRhythms();
    const filtered = list.filter(r => r.bpm >= minBpm && r.bpm <= maxBpm);

    container.replaceChildren();

    if (filtered.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'metro-saved-empty';
      empty.textContent = list.length === 0
        ? 'Žádné uložené rytmy.'
        : 'Žádné rytmy v zadaném rozsahu BPM.';
      container.appendChild(empty);
      return;
    }

    const table = document.createElement('table');
    table.className = 'metro-saved-table';

    const thead = table.createTHead();
    const hRow = thead.insertRow();
    ['Název', 'Vzor', 'BPM', ''].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      hRow.appendChild(th);
    });

    const tbody = table.createTBody();
    for (const saved of filtered) {
      const tr = tbody.insertRow();
      tr.className = 'metro-saved-row';
      tr.dataset.name = saved.name;
      tr.setAttribute('tabindex', '0');
      tr.setAttribute('title', `Načíst: ${saved.name}`);
      tr.addEventListener('click', e => {
        if (!e.target.classList.contains('metro-delete-btn')) onLoadSavedRhythm(saved);
      });
      tr.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onLoadSavedRhythm(saved); }
      });

      [saved.name, savedRhythmPatternLabel(saved), saved.bpm].forEach(text => {
        tr.insertCell().textContent = String(text);
      });

      const deleteTd = tr.insertCell();
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'metro-delete-btn';
      deleteBtn.textContent = 'Smazat';
      deleteBtn.setAttribute('aria-label', `Smazat rytmus ${saved.name}`);
      deleteBtn.addEventListener('click', e => { e.stopPropagation(); onDeleteSavedRhythm(saved.name); });
      deleteTd.appendChild(deleteBtn);
    }

    container.appendChild(table);
  }

  function onSaveRhythm() {
    // An empty name field saves under the default name (pattern + tempo, its placeholder)
    const nameInput = document.getElementById('metro-rhythm-name');
    const name = nameInput?.value.trim() || defaultRhythmName(state);

    const rhythm = {
      name,
      patternId: state.patternId,
      bpm: state.bpm,
      customBeats: state.patternId === 'custom' ? state.customBeats : null,
      customAccents: state.patternId === 'custom' ? state.customAccents : null,
    };

    persistSavedRhythms(upsertSavedRhythm(loadSavedRhythms(), rhythm));
    updateFilterRange();
    renderSavedRhythms();
    flashRhythmRow(name);
  }

  // Briefly highlights the row of a just saved or loaded rhythm, so it is visible what
  // happened (scrolled into view when needed; nothing when the BPM filter hides it).
  const SAVED_FLASH_MS = 1600;
  const flashTimers = new WeakMap();   // row → timer removing the highlight

  function flashRhythmRow(name) {
    const row = [...document.querySelectorAll('.metro-saved-row')].find(tr => tr.dataset.name === name);
    if (!row) return;
    row.classList.remove('just-saved');
    void row.offsetWidth;   // restart the animation on a repeated click
    row.classList.add('just-saved');
    row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    clearTimeout(flashTimers.get(row));
    flashTimers.set(row, setTimeout(() => row.classList.remove('just-saved'), SAVED_FLASH_MS));
  }

  function onLoadSavedRhythm(saved) {
    state.patternId = saved.patternId;
    state.bpm = saved.bpm;
    if (saved.patternId === 'custom') {
      state.customBeats = saved.customBeats ?? state.customBeats;
      state.customAccents = saved.customAccents ?? state.customAccents;
    }
    saveState();

    const nameInput = document.getElementById('metro-rhythm-name');
    if (nameInput) nameInput.value = saved.name;

    renderPatternChips();
    renderBeatDots();
    updateBpmDisplay();
    updateCustomSection();
    restartIfPlaying();
    flashRhythmRow(saved.name);
  }

  // Deletes right away; a short notice offers to undo it (button or Cmd+Z / Ctrl+Z).
  // → true when the rhythm was deleted.
  function onDeleteSavedRhythm(name) {
    const list = loadSavedRhythms();
    const rhythm = list.find(r => r.name === name);
    if (!rhythm) return false;
    persistSavedRhythms(deleteSavedRhythm(list, name));
    updateFilterRange();
    renderSavedRhythms();
    lastDeleted = rhythm;
    showUndoToast(`Rytmus „${name}“ byl smazán.`);

    return true;
  }

  // ── Undo of the last deletion ──────────────────────────────────────────────

  const UNDO_TOAST_MS = 6000;
  let lastDeleted = null;
  let undoToastTimer = null;

  function showUndoToast(message) {
    const toast = document.getElementById('metro-toast');
    if (!toast) return;
    document.getElementById('metro-toast-text').textContent = message;
    toast.hidden = false;
    clearTimeout(undoToastTimer);
    undoToastTimer = setTimeout(hideUndoToast, UNDO_TOAST_MS);
  }

  // Once the notice is gone, the deletion is final
  function hideUndoToast() {
    clearTimeout(undoToastTimer);
    const toast = document.getElementById('metro-toast');
    if (toast) toast.hidden = true;
    lastDeleted = null;
  }

  // Puts the last deleted rhythm back (merged into the current list, so rhythms saved
  // in the meantime stay) and highlights its row. → true when there was one to restore.
  function undoDelete() {
    if (!lastDeleted) return false;
    const rhythm = lastDeleted;
    persistSavedRhythms(upsertSavedRhythm(loadSavedRhythms(), rhythm));
    hideUndoToast();
    updateFilterRange();
    renderSavedRhythms();
    flashRhythmRow(rhythm.name);

    return true;
  }

  function updateFilterRange() {
    const list = loadSavedRhythms();
    const minInput = document.getElementById('metro-filter-min');
    const maxInput = document.getElementById('metro-filter-max');
    if (!minInput || !maxInput) return;
    if (list.length === 0) {
      minInput.value = 40;
      maxInput.value = 240;
    } else {
      const bpms = list.map(r => r.bpm);
      minInput.value = Math.min(...bpms);
      maxInput.value = Math.max(...bpms);
    }
  }

  // ── Tap tempo ──────────────────────────────────────────────────────────────

  function onTap() {
    const now = performance.now();
    tapTimes.push(now);
    if (tapTimes.length > 8) tapTimes.shift();
    if (tapTimes.length < 2) return;
    let total = 0;
    for (let i = 1; i < tapTimes.length; i++) total += tapTimes[i] - tapTimes[i - 1];
    onBpmChange(Math.round(60000 / (total / (tapTimes.length - 1))));
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function initMetronome() {
    state = loadState();

    import('/js/site-layout.js').then(({ initSitePage }) => initSitePage({ currentSectionId: 'metronome', analytics: true }));

    renderPatternChips();
    renderBeatDots();
    updateBpmDisplay();
    updateCustomSection();
    updatePlayButton();
    updateFilterRange();
    renderSavedRhythms();
    updateRhythmNamePlaceholder();

    const customBeatsSlider = document.getElementById('metro-custom-beats');
    if (customBeatsSlider) {
      customBeatsSlider.addEventListener('input', () => setCustomBeats(customBeatsSlider.value));
    }

    document.getElementById('metro-bpm-slider')
      ?.addEventListener('input', e => onBpmChange(e.target.value));
    document.getElementById('metro-bpm-minus')
      ?.addEventListener('click', () => onBpmChange(state.bpm - 1));
    document.getElementById('metro-bpm-plus')
      ?.addEventListener('click', () => onBpmChange(state.bpm + 1));
    document.getElementById('metro-play')
      ?.addEventListener('click', togglePlay);
    initPageKeys(onMetronomeKey);
    initUndoKey((e) => { if (undoDelete()) e.preventDefault(); });
    document.getElementById('metro-toast-undo')?.addEventListener('click', undoDelete);
    document.getElementById('metro-tap')
      ?.addEventListener('click', onTap);
    document.getElementById('metro-save-rhythm')
      ?.addEventListener('click', onSaveRhythm);
    document.getElementById('metro-filter-min')
      ?.addEventListener('input', renderSavedRhythms);
    document.getElementById('metro-filter-max')
      ?.addEventListener('input', renderSavedRhythms);
  }

  document.addEventListener('DOMContentLoaded', initMetronome);
}
