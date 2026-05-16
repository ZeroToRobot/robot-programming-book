(function () {
  var GA4_ID = 'G-YMWELTRJ0W';       // Replace with your GA4 Measurement ID
  var CLARITY_ID = 'weiun0cwrv';     // Replace with your Clarity Project ID

  // ── Google Analytics 4 ──────────────────────────────────
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', GA4_ID, {
    page_title: document.title,
    page_location: window.location.href,
  });

  var gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
  document.head.appendChild(gaScript);

  // ── Microsoft Clarity ────────────────────────────────────
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1;
    t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', CLARITY_ID);
})();
