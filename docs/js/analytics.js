const MEASUREMENT_ID = 'G-94EC5C6TB0';

export function initAnalytics() {
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function() { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID, {
    storage:  'none',
    storeGac: false,
  });
}

export function trackScaleView(scaleId, variantType = 'natural') {
  if (typeof gtag === 'undefined') return;
  gtag('event', 'scale_view', {
    scale_id:     scaleId,
    variant_type: variantType,
  });
}
