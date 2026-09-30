/* Answer codec for share links.
 *
 * The rigged answer travels in the URL fragment (#...), which browsers never send to a server.
 * It is obfuscated, NOT encrypted: anyone who reads this file can decode a link.
 *
 * Byte layout before base64url:
 *   [salt] [VERSION ^ k0] [utf8 bytes ^ k1..kn] [checksum ^ k(n+1)]
 * The keystream mixes a fixed key with the per-link random salt and the byte position, so the
 * same answer produces a different-looking link each time and repeated letters don't repeat.
 * The version byte + checksum let garbage fragments be rejected (the ball then answers normally).
 */
(function (global) {
  'use strict';

  var KEY = new TextEncoder().encode('outlook not so good // reply hazy, try again');
  var VERSION = 0x8b;
  var MAX_CHARS = 80;      // code points; enforced by the set page
  var MAX_BYTES = 1024;    // decode refuses anything longer

  function k(salt, i) {
    return (KEY[i % KEY.length] ^ ((salt + i * 167) & 255) ^ ((i * i * 13 + 91) & 255)) & 255;
  }

  function toB64u(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromB64u(str) {
    if (!/^[A-Za-z0-9_-]+$/.test(str)) return null;
    var b = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    try {
      var bin = atob(b);
      var out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    } catch (e) {
      return null;
    }
  }

  function clean(text) {
    return String(text).replace(/\s+/g, ' ').trim();
  }

  function encode(text, salt) {
    var data = new TextEncoder().encode(clean(text));
    if (salt == null) salt = crypto.getRandomValues(new Uint8Array(1))[0];
    salt &= 255;
    var out = new Uint8Array(data.length + 3);
    var sum = VERSION;
    out[0] = salt;
    out[1] = VERSION ^ k(salt, 0);
    for (var i = 0; i < data.length; i++) {
      out[i + 2] = data[i] ^ k(salt, i + 1);
      sum = (sum * 31 + data[i]) & 255;
    }
    out[out.length - 1] = sum ^ k(salt, data.length + 1);
    return toB64u(out);
  }

  function decode(payload) {
    if (!payload) return null;
    payload = String(payload).replace(/^#/, '');
    try { payload = decodeURIComponent(payload); } catch (e) { /* keep raw */ }
    var bytes = fromB64u(payload);
    if (!bytes || bytes.length < 4 || bytes.length > MAX_BYTES) return null;
    var salt = bytes[0];
    if ((bytes[1] ^ k(salt, 0)) !== VERSION) return null;
    var n = bytes.length - 3;
    var data = new Uint8Array(n);
    var sum = VERSION;
    for (var i = 0; i < n; i++) {
      data[i] = bytes[i + 2] ^ k(salt, i + 1);
      sum = (sum * 31 + data[i]) & 255;
    }
    if ((bytes[bytes.length - 1] ^ k(salt, n + 1)) !== sum) return null;
    try {
      var text = clean(new TextDecoder('utf-8', { fatal: true }).decode(data));
      return text || null;
    } catch (e) {
      return null;
    }
  }

  // Count user-perceived characters, so a family emoji counts as one.
  var seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  function chars(text) {
    if (!seg) return Array.from(text);
    var out = [];
    for (var s of seg.segment(text)) out.push(s.segment);
    return out;
  }

  function charCount(text) {
    return chars(text).length;
  }

  function truncate(text, max) {
    return chars(text).slice(0, max || MAX_CHARS).join('');
  }

  global.EightCodec = {
    encode: encode,
    decode: decode,
    clean: clean,
    charCount: charCount,
    truncate: truncate,
    MAX_CHARS: MAX_CHARS
  };
})(window);
