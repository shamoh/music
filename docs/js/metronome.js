// ── Pure functions (exported for testing) ─────────────────────────────────────

export const RHYTHM_PATTERNS = [
  { id: '4/4', label: '4/4 — základní',      beats: 4, accents: [0]    },
  { id: '3/4', label: '3/4 — valčík',        beats: 3, accents: [0]    },
  { id: '2/4', label: '2/4 — pochod',        beats: 2, accents: [0]    },
  { id: '6/8', label: '6/8 — šestiosminový', beats: 6, accents: [0, 3] },
  { id: '5/4', label: '5/4 — složený',       beats: 5, accents: [0, 3] },
  { id: 'custom', label: 'Vlastní',           beats: null, accents: null },
];

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
    const nameInput = document.getElementById('metro-rhythm-name');
    const name = nameInput?.value.trim();
    if (!name) { nameInput?.focus(); return; }

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
  }

  function onDeleteSavedRhythm(name) {
    if (!confirm(`Smazat rytmus „${name}"?`)) return;
    persistSavedRhythms(deleteSavedRhythm(loadSavedRhythms(), name));
    updateFilterRange();
    renderSavedRhythms();
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

    import('/js/themes.js').then(({ VISUAL_PROFILES, applyProfile, savedProfileId }) => {
      applyProfile(savedProfileId());
      const sel     = document.getElementById('profile-select');
      const current = savedProfileId();
      for (const p of VISUAL_PROFILES) {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        if (p.id === current) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener('change', e => applyProfile(e.target.value));
    });

    import('/js/analytics.js').then(({ initAnalytics }) => initAnalytics());

    import('/js/defaults.js').then(({ APP_VERSION, BUILD_DATE }) => {
      const footer = document.getElementById('app-footer');
      if (footer) {
        const a = Object.assign(document.createElement('a'), {
          href: '/history.html',
          textContent: `Scales v${APP_VERSION} · ${BUILD_DATE}`,
        });
        footer.appendChild(a);
      }
    });

    renderPatternChips();
    renderBeatDots();
    updateBpmDisplay();
    updateCustomSection();
    updatePlayButton();
    updateFilterRange();
    renderSavedRhythms();

    const customBeatsSlider = document.getElementById('metro-custom-beats');
    if (customBeatsSlider) {
      customBeatsSlider.addEventListener('input', () => {
        state.customBeats = validateBeatCount(customBeatsSlider.value);
        state.customAccents = state.customAccents.filter(i => i < state.customBeats);
        saveState();
        renderAccentButtons();
        renderBeatDots();
        restartIfPlaying();
      });
    }

    document.getElementById('metro-bpm-slider')
      ?.addEventListener('input', e => onBpmChange(e.target.value));
    document.getElementById('metro-bpm-minus')
      ?.addEventListener('click', () => onBpmChange(state.bpm - 1));
    document.getElementById('metro-bpm-plus')
      ?.addEventListener('click', () => onBpmChange(state.bpm + 1));
    document.getElementById('metro-play')
      ?.addEventListener('click', () => { if (isPlaying) stopMetronome(); else startMetronome(); });
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
