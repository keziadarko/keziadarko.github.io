(function () {
  var canvas = document.getElementById('field');
  var ctx = canvas.getContext && canvas.getContext('2d');
  var scenes = Array.prototype.slice.call(document.querySelectorAll('.scene'));
  var bar = document.getElementById('progress');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!ctx) return;

  var W, H, dpr, N, parts = [], targets = {}, active = 0;
  var colours = ['#2F7BFF', '#22D3EE', '#7FB0FF', '#F5B53D'];

  function shield(c, w, h) {
    var s = Math.min(w, h) * 0.8, x = (w - s * 0.82) / 2, y = (h - s) / 2;
    c.beginPath();
    c.moveTo(x + s * 0.41, y);
    c.lineTo(x + s * 0.82, y + s * 0.17);
    c.lineTo(x + s * 0.82, y + s * 0.5);
    c.bezierCurveTo(x + s * 0.82, y + s * 0.78, x + s * 0.62, y + s * 0.93, x + s * 0.41, y + s);
    c.bezierCurveTo(x + s * 0.2, y + s * 0.93, x, y + s * 0.78, x, y + s * 0.5);
    c.lineTo(x, y + s * 0.17);
    c.closePath();
    c.fill();
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    c.arc(x + s * 0.41, y + s * 0.47, s * 0.12, 0, Math.PI * 2);
    c.fill();
    c.globalCompositeOperation = 'source-over';
  }

  function sample(spec) {
    var narrow = W < 860;
    var rw = narrow ? W * 0.9 : W * 0.48, rh = narrow ? H * 0.42 : H * 0.62;
    var ox = narrow ? (W - rw) / 2 : W * 0.48, oy = narrow ? H * 0.1 : (H - rh) / 2;
    var off = document.createElement('canvas');
    off.width = Math.round(rw); off.height = Math.round(rh);
    var c = off.getContext('2d');
    c.fillStyle = '#fff';
    if (spec === 'shield') shield(c, off.width, off.height);
    else {
      var txt = spec.slice(5), size = off.height;
      c.font = '800 ' + size + 'px Archivo, system-ui, sans-serif';
      while (c.measureText(txt).width > off.width * 0.95 && size > 20) { size -= 4; c.font = '800 ' + size + 'px Archivo, system-ui, sans-serif'; }
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(txt, off.width / 2, off.height / 2 + size * 0.04);
    }
    var data = c.getImageData(0, 0, off.width, off.height).data, pts = [], filled = 0;
    for (var q = 3; q < data.length; q += 16) if (data[q] > 128) filled++;
    var gap = Math.max(3, Math.round(Math.sqrt(filled * 4 / (N * 0.95))));
    for (var y = 0; y < off.height; y += gap) for (var x = 0; x < off.width; x += gap) {
      if (data[(y * off.width + x) * 4 + 3] > 128) pts.push([ox + x, oy + y]);
    }
    for (var i = pts.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
    return pts;
  }

  function setup() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    N = W < 860 ? 1100 : 2400;
    while (parts.length < N) parts.push({ x: Math.random() * W, y: Math.random() * H, tx: 0, ty: 0, free: true, c: colours[Math.random() < 0.06 ? 3 : Math.floor(Math.random() * 3)], s: Math.random() < 0.15 ? 2.8 : 2.1, ph: Math.random() * 6.28 });
    parts.length = N;
    targets = {};
    scenes.forEach(function (s) { var k = s.dataset.shape; if (!targets[k]) targets[k] = sample(k); });
    assign(active);
  }

  function assign(i) {
    var pts = targets[scenes[i].dataset.shape] || [];
    for (var k = 0; k < parts.length; k++) {
      var p = parts[k];
      if (k < pts.length) { p.tx = pts[k][0]; p.ty = pts[k][1]; p.free = false; }
      else { p.tx = Math.random() * W; p.ty = Math.random() * H; p.free = true; }
      if (reduce) { p.x = p.tx; p.y = p.ty; }
    }
  }

  var t = 0;
  function frame() {
    t += 0.016;
    ctx.clearRect(0, 0, W, H);
    for (var k = 0; k < parts.length; k++) {
      var p = parts[k];
      if (!reduce) {
        p.x += (p.tx - p.x) * 0.06; p.y += (p.ty - p.y) * 0.06;
        if (p.free) { p.tx += Math.sin(t + p.ph) * 0.35; p.ty += Math.cos(t * 0.8 + p.ph) * 0.35; }
      }
      ctx.globalAlpha = p.free ? 0.18 : 0.9;
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, p.s, p.s);
    }
    ctx.globalAlpha = 1;
    if (!reduce) requestAnimationFrame(frame);
  }

  function onScroll() {
    var max = document.documentElement.scrollHeight - H;
    bar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
    var mid = H / 2, best = active;
    scenes.forEach(function (s, i) { var r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) best = i; });
    if (best !== active) { active = best; assign(active); if (reduce) frame(); }
  }

  function start() { setup(); frame(); onScroll(); }
  if (document.fonts && document.fonts.load) document.fonts.load('800 100px Archivo').then(start, start); else start();
  window.addEventListener('scroll', onScroll, { passive: true });
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { setup(); if (reduce) frame(); }, 150); });
})();
