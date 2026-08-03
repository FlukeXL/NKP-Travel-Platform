(function () {
  'use strict';

  const HTML_ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  const HTML_ESCAPE_REGEX = /[&<>"'`=\/]/g;

  /**
   * Escape untrusted text before inserting into DOM / innerHTML
   * @param {any} str 
   * @returns {string}
   */
  function mnxEscapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(HTML_ESCAPE_REGEX, (s) => HTML_ESCAPE_MAP[s] || s);
  }

  /**
   * Sanitize URLs to prevent `javascript:`, `vbscript:`, and `data:` schemes
   * @param {string} url 
   * @param {string} fallback 
   * @returns {string}
   */
  function mnxSanitizeUrl(url, fallback = '#') {
    if (!url || typeof url !== 'string') return fallback;
    const trimmed = url.trim();
    const lower = trimmed.toLowerCase();

    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('vbscript:') ||
      lower.startsWith('data:text/html') ||
      lower.startsWith('data:application/javascript')
    ) {
      return fallback;
    }

    if (
      trimmed.startsWith('/') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('./') ||
      trimmed.startsWith('../') ||
      lower.startsWith('http://') ||
      lower.startsWith('https://') ||
      lower.startsWith('mailto:') ||
      lower.startsWith('tel:') ||
      lower.startsWith('blob:') ||
      lower.startsWith('data:image/')
    ) {
      return trimmed;
    }

    return fallback;
  }

  function mnxSafeText(str, maxLen = 500, fallback = '') {
    if (str == null) return fallback;
    const s = String(str).trim();
    if (!s) return fallback;
    return mnxEscapeHtml(maxLen && s.length > maxLen ? s.slice(0, maxLen) + '...' : s);
  }

  window.mnxEscapeHtml = mnxEscapeHtml;
  window.mnxSanitizeUrl = mnxSanitizeUrl;
  window.mnxSafeText = mnxSafeText;
})();
