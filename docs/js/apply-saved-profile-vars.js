// Applies the CSS variables of the last visual profile (stored by applyProfile in
// themes.js) before the first paint, so the page does not flash in the default colors.
// A classic (blocking) script in <head> of every page — modules run only after parsing.
try {
  const vars = JSON.parse(localStorage.getItem('scales-profile-vars') || 'null');
  if (vars) {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  }
} catch (_) {}
