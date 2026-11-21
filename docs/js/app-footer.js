// App footer shared by all pages: version link to the history page and the license link.
import { APP_VERSION, BUILD_DATE } from './defaults.js';

// License page inside the app (cached by the service worker, available offline)
export const LICENSE_URL = '/license.html';
export const LICENSE_NAME = 'FSL-1.1-MIT';

const FOOTER_SEPARATOR = ' · ';

// Links shown in the footer, in display order
export function appFooterLinks({ appVersion = APP_VERSION, buildDate = BUILD_DATE } = {}) {
  return [
    { href: '/history.html', text: `Scales v${appVersion} · ${buildDate}` },
    { href: LICENSE_URL, text: `Licence ${LICENSE_NAME}` },
  ];
}

// Fills the footer element with the footer links separated by a dot
export function renderAppFooter(footerElement, { documentRef = document, links = appFooterLinks() } = {}) {
  if (!footerElement) return;

  links.forEach((link, index) => {
    if (index > 0) footerElement.appendChild(documentRef.createTextNode(FOOTER_SEPARATOR));

    footerElement.appendChild(Object.assign(documentRef.createElement('a'), { href: link.href, textContent: link.text }));
  });
}
