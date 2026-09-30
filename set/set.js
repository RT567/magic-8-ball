(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var input = $('answer'), count = $('count'), die = $('die'), out = $('out'), link = $('link');
  var copyBtn = $('copy'), shareBtn = $('share'), tryLink = $('try');
  var MAX = EightCodec.MAX_CHARS;
  var PLACEHOLDER = 'Your answer here';
  var salt = crypto.getRandomValues(new Uint8Array(1))[0];   // stable per visit, so the link doesn't flicker
  var base = new URL('../', location.href);
  base.hash = '';
  base.search = '';

  EightDie.build(die);

  function currentText() {
    return EightCodec.clean(input.value);
  }

  function render() {
    // no newlines; cap by characters (emoji count as one where possible)
    var v = input.value.replace(/[\r\n]+/g, ' ');
    if (EightCodec.charCount(v) > MAX) v = EightCodec.truncate(v, MAX);
    if (v !== input.value) input.value = v;

    // grow the box to fit
    input.style.height = 'auto';
    input.style.height = (input.scrollHeight + 2) + 'px';

    var text = currentText();
    var n = EightCodec.charCount(text);
    count.textContent = n + ' / ' + MAX;
    count.classList.toggle('full', n >= MAX);

    die.classList.toggle('has-text', !!text);
    EightDie.fit(die, text || PLACEHOLDER);

    if (text) {
      var url = base.href + '#' + EightCodec.encode(text, salt);
      link.value = url;
      tryLink.href = url;
      out.hidden = false;
    } else {
      out.hidden = true;
    }
    copyBtn.textContent = 'Copy link';
  }

  input.addEventListener('input', render);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
  });

  link.addEventListener('focus', function () { link.select(); });

  copyBtn.addEventListener('click', function () {
    var done = function () {
      copyBtn.textContent = 'Copied!';
      setTimeout(function () { copyBtn.textContent = 'Copy link'; }, 1800);
    };
    var fallback = function () {
      link.focus();
      link.select();
      try { document.execCommand('copy'); done(); } catch (e) { copyBtn.textContent = 'Select & copy'; }
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link.value).then(done, fallback);
    } else {
      fallback();
    }
  });

  if (navigator.share) {
    shareBtn.hidden = false;
    shareBtn.addEventListener('click', function () {
      navigator.share({ title: 'Magic 8-Ball', url: link.value }).catch(function () { /* cancelled */ });
    });
  }

  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(render, 150); });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
  render();
})();
