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
  if (!pattern || !Array.isArray(pattern.accents) || pattern.accents.length === 0) {
    return beatIndex === 0;
  }
  return pattern.accents.includes(beatIndex);
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

    const customBeatsSlider = document.getElementById('metro-custom-beats');
    if (customBeatsSlider) {
      customBeatsSlider.addEventListener('input', () => {
        state.customBeats = validateBeatCount(customBeatsSlider.value);
        state.customAccents = state.customAccents.filter(i => i < state.customBeats);
        if (state.customAccents.length === 0) state.customAccents = [0];
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
  }

  document.addEventListener('DOMContentLoaded', initMetronome);
}
