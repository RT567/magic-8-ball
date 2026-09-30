(function () {
  'use strict';

  var ANSWERS = [
    'It is certain', 'It is decidedly so', 'Without a doubt', 'Yes definitely',
    'You may rely on it', 'As I see it, yes', 'Most likely', 'Outlook good',
    'Yes', 'Signs point to yes',
    'Reply hazy, try again', 'Ask again later', 'Better not tell you now',
    'Cannot predict now', 'Concentrate and ask again',
    "Don't count on it", 'My reply is no', 'My sources say no',
    'Outlook not so good', 'Very doubtful'
  ];

  var TEASERS = [
    'The spirits are consulting…',
    'Blah blah blah…',
    'Hmm. Hmmmmm.',
    'Mumble mumble…',
    'The murk is thick today…',
    'Consulting the ancient fluid…',
    'It is thinking about you…',
    'Oooooooh…',
    'Summoning the truth…'
  ];

  var $ = function (id) { return document.getElementById(id); };
  var orb = $('orb'), ball = $('ball'), die = $('die'), flash = $('flash');
  var whisper = $('whisper'), hint = $('hint'), announce = $('announce');
  var bubbles = ball.querySelector('.bubbles');

  var mouse = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var verb = mouse ? 'click' : 'tap';
  hint.textContent = verb + ' to shake';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var busy = false;
  var current = '';
  var lastTeaser = -1;

  EightDie.build(die);

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, reduced ? Math.min(ms, 350) : ms); });
  }

  // A valid payload in the fragment rigs every shake; otherwise it's a normal 8-ball.
  function answer() {
    var rigged = EightCodec.decode(location.hash);
    if (rigged) return rigged;
    return ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
  }

  // Teasers murmur inside the window, in the liquid.
  function say(text) {
    whisper.classList.remove('show');
    return sleep(280).then(function () {
      whisper.textContent = text;
      whisper.classList.add('show');
    });
  }

  function teaser() {
    var i;
    do { i = Math.floor(Math.random() * TEASERS.length); } while (i === lastTeaser);
    lastTeaser = i;
    return TEASERS[i];
  }

  function restart(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function vibrate(p) {
    try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignore */ }
  }

  async function shake() {
    if (busy) return;
    busy = true;
    ball.setAttribute('aria-busy', 'true');
    announce.textContent = '';
    hint.classList.add('gone');
    var text = answer();

    // sink the previous answer back into the murk
    die.classList.remove('up');
    bubbles.classList.remove('fizz');
    var firstTime = ball.dataset.side === 'eight';

    vibrate([40, 60, 40, 60, 40]);
    restart(ball, 'shaking');
    restart(orb, 'shaking');
    await sleep(1150);
    ball.classList.remove('shaking');
    orb.classList.remove('shaking');

    if (firstTime) {
      ball.classList.add('rolling');
      await sleep(1020);
      ball.dataset.side = 'window';
      ball.classList.remove('rolling');
    }

    // fit the text now, while the die is invisible
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* ignore */ } }
    current = text;
    EightDie.fit(die, text);

    ball.classList.add('consulting');
    await say(teaser());
    await sleep(1100);
    die.classList.add('lurk');
    await say(teaser());
    await sleep(1100);
    await say('Something is surfacing…');
    await sleep(850);

    // bang
    whisper.classList.remove('show');
    ball.classList.remove('consulting');
    die.classList.remove('lurk');
    die.classList.add('up');
    bubbles.classList.add('fizz');
    restart(flash, 'go');
    restart(orb, 'bump');
    vibrate(60);
    announce.textContent = 'The Magic 8-Ball says: ' + text;

    await sleep(1600);
    bubbles.classList.remove('fizz');
    hint.textContent = verb + ' to ask again';
    hint.classList.remove('gone');
    ball.setAttribute('aria-busy', 'false');
    ball.setAttribute('aria-label', 'The Magic 8-Ball says: ' + text + '. Tap to shake again.');
    busy = false;
  }

  ball.addEventListener('click', shake);
  // Space / Enter anywhere on the page (the button itself already handles them when focused)
  document.addEventListener('keydown', function (e) {
    if (e.target === ball || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); shake(); }
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (current) EightDie.fit(die, current); }, 150);
  });

  // ---- shake the phone (best effort; tapping is the main way) ----
  var lastAcc = null, hits = 0, firstHit = 0;
  function onMotion(e) {
    var a = e.accelerationIncludingGravity;
    if (!a || a.x == null) return;
    if (lastAcc) {
      var delta = Math.abs(a.x - lastAcc.x) + Math.abs(a.y - lastAcc.y) + Math.abs(a.z - lastAcc.z);
      var now = Date.now();
      if (delta > 28) {
        if (now - firstHit > 800) { firstHit = now; hits = 0; }
        hits++;
        if (hits >= 3 && !busy) { hits = 0; shake(); }
      }
    }
    lastAcc = { x: a.x, y: a.y, z: a.z };
  }

  // Phone shake only where it needs no permission prompt (Android etc.). iOS gates motion
  // behind a permission dialog, which would ambush the suspense, so iOS is tap-only.
  var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (coarse && !iOS && 'ondevicemotion' in window) {
    window.addEventListener('devicemotion', onMotion);
  }
})();
