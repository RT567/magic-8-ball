/* The blue icosahedron face that floats up in the window, and fitting text onto it.
 * Text flows inside the triangle using two floats with shape-outside, then the largest
 * font size that keeps the text inside the triangle is picked. */
(function (global) {
  'use strict';

  var SVG =
    '<svg class="die__svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false">' +
      '<defs>' +
        '<linearGradient id="dieFace" x1="0.3" y1="0" x2="0.6" y2="1">' +
          '<stop offset="0" stop-color="#3d63ff"/><stop offset="0.55" stop-color="#2442d8"/><stop offset="1" stop-color="#172ea6"/>' +
        '</linearGradient>' +
        '<linearGradient id="dieSide" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#0f1c6a"/><stop offset="1" stop-color="#040a30"/>' +
        '</linearGradient>' +
        '<radialGradient id="dieSheen" cx="0.42" cy="0.38" r="0.62">' +
          '<stop offset="0" stop-color="#cfe0ff" stop-opacity="0.32"/><stop offset="0.6" stop-color="#9fb8ff" stop-opacity="0.06"/><stop offset="1" stop-color="#9fb8ff" stop-opacity="0"/>' +
        '</radialGradient>' +
      '</defs>' +
      '<polygon points="100,18 14,167 -1,59" fill="url(#dieSide)" opacity="0.7"/>' +
      '<polygon points="100,18 186,167 201,59" fill="url(#dieSide)" opacity="0.5"/>' +
      '<polygon points="14,167 186,167 100,234" fill="url(#dieSide)" opacity="0.6"/>' +
      '<polygon points="100,18 14,167 186,167" fill="url(#dieFace)" stroke="#2a47dc" stroke-width="5" stroke-linejoin="round"/>' +
      '<polygon points="100,18 14,167 186,167" fill="url(#dieSheen)"/>' +
      '<polygon points="100,20 16,166 184,166" fill="none" stroke="#9db4ff" stroke-opacity="0.35" stroke-width="1.2" stroke-linejoin="round"/>' +
    '</svg>';

  var TEXT =
    '<div class="die__text">' +
      '<span class="die__float die__float--l"></span>' +
      '<span class="die__float die__float--r"></span>' +
      '<p class="die__words"><span></span></p>' +
    '</div>';

  function build(host) {
    host.innerHTML = '<div class="die__inner">' + SVG + TEXT + '</div>';
    return host;
  }

  /* Fit `text` into the die inside `host`. Measures on an off-screen clone so the
   * die's own animation transforms don't skew the numbers. */
  function fit(host, text) {
    var region = host.querySelector('.die__text');
    var words = region.querySelector('.die__words');
    var span = words.firstChild;
    span.textContent = text;
    var W = region.offsetWidth, H = region.offsetHeight;
    if (!W || !H) return;

    var m = document.createElement('div');
    m.className = 'die__text die__text--measure';
    m.style.width = W + 'px';
    m.style.height = H + 'px';
    m.innerHTML = TEXT.replace(/^<div class="die__text">|<\/div>$/g, '');
    document.body.appendChild(m);
    var mw = m.querySelector('.die__words');
    var ms = mw.firstChild;
    ms.textContent = text;

    var limit = H * 0.9;
    var maxFs = H * 0.16, minFs = H * 0.052;

    function measure() {
      var base = m.getBoundingClientRect();
      var rects = ms.getClientRects();
      if (!rects.length) return { top: 0, bottom: 0, fits: true };
      var top = Infinity, bottom = -Infinity, inside = true;
      for (var i = 0; i < rects.length; i++) {
        var r = rects[i];
        top = Math.min(top, r.top - base.top);
        bottom = Math.max(bottom, r.bottom - base.top);
        if (r.left - base.left < -1 || r.right - base.left > W + 1) inside = false;
      }
      return { top: top, bottom: bottom, fits: inside && bottom <= limit };
    }

    var fs = minFs, broken = false, found = false;
    for (var pass = 0; pass < 2 && !found; pass++) {
      broken = pass === 1;
      mw.classList.toggle('die__words--break', broken);
      for (var f = maxFs; f >= minFs; f *= 0.94) {
        mw.style.fontSize = f + 'px';
        mw.style.paddingTop = '0px';
        if (measure().fits) { fs = f; found = true; break; }
      }
    }
    if (!found) { fs = minFs; broken = true; }
    mw.style.fontSize = fs + 'px';
    mw.classList.toggle('die__words--break', broken);

    // Nudge the block down toward the triangle's visual centre without overflowing.
    var a = measure();
    var pad = Math.max(0, Math.min(H * 0.6 - (a.top + a.bottom) / 2, limit - a.bottom));
    mw.style.paddingTop = pad + 'px';
    if (!measure().fits) pad = 0;
    document.body.removeChild(m);

    words.style.fontSize = fs + 'px';
    words.style.paddingTop = pad + 'px';
    words.classList.toggle('die__words--break', broken);
  }

  global.EightDie = { build: build, fit: fit };
})(window);
