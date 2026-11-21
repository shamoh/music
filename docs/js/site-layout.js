// Shared frame of every page: the header (logo, navigation, settings menu), the footer
// (version, license), the visual profile and optionally analytics and offline support —
// one call on page load.
import { renderSiteHeader } from './site-header.js';
import { renderAppFooter } from './app-footer.js';
import { applyProfile, savedProfileId, initProfileSelect } from './themes.js';
import { initAnalytics } from './analytics.js';
import { registerServiceWorker } from './service-worker-registration.js';

// Renders <header id="site-header"> and <footer id="app-footer">, applies the saved visual
// profile and fills the profile select of the settings menu. Call first on page load.
// - currentSectionId / settingsRows: see renderSiteHeader
// - onProfileChange: runs after the user picked another profile (e.g. to redraw the staves)
// - analytics: loads Google Analytics (initAnalytics)
// - offlineSupport: registers the PWA service worker (registerServiceWorker) — on every
//   page by default, so the app works offline wherever the user opened it
// - pageServices: the analytics / service worker functions (tests pass stand-ins)
export function initSitePage({
  currentSectionId = null,
  settingsRows = [],
  onProfileChange = () => {},
  analytics = false,
  offlineSupport = true,
  documentRef = document,
  pageServices = { initAnalytics, registerServiceWorker },
} = {}) {
  renderSiteHeader(documentRef.getElementById('site-header'), { currentSectionId, settingsRows, documentRef });
  renderAppFooter(documentRef.getElementById('app-footer'), { documentRef });
  applyProfile(savedProfileId());
  initProfileSelect(documentRef.getElementById('profile-select'), onProfileChange);
  if (analytics) pageServices.initAnalytics();
  if (offlineSupport) pageServices.registerServiceWorker();
}
