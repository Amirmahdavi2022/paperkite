'use strict';

/* Paperkite reference renderer, v2.
   Integer arithmetic only, so the Solidity port produces identical bytes. */

const STOCKS = [
  { name: 'dawn', sky0: '#fbdfc4', sky1: '#f8c6a4', sky2: '#f4a98a',
    disc: '#fff3e0', kite: '#b4483c', warm: '#ffd98a',
    layers: ['#efa98c', '#e0876f', '#c46a62', '#9c4c57', '#6e3550', '#3f2038'] },
  { name: 'dusk', sky0: '#9d99d6', sky1: '#7a74ae', sky2: '#5a5490',
    disc: '#f5ecd6', kite: '#e2b24c', warm: '#ffd27a',
    layers: ['#7c78b4', '#676198', '#514b7d', '#3b3660', '#272343', '#14122a'] },
  { name: 'night', sky0: '#223057', sky1: '#14203a', sky2: '#0a1020',
    disc: '#eaf0f8', kite: '#d9a441', warm: '#ffc861',
    layers: ['#2c3d63', '#24334f', '#1c283e', '#14202f', '#0d1622', '#060c14'] },
  { name: 'harvest', sky0: '#f9ecc8', sky1: '#f3d491', sky2: '#edbe72',
    disc: '#fff8e6', kite: '#7a3b2e', warm: '#ffcf6b',
    layers: ['#e9b871', '#d89a55', '#c07c42', '#98603a', '#6b4028', '#40251a'] },
  { name: 'mist', sky0: '#eef3f0', sky1: '#dae3df', sky2: '#c6d2cc',
    disc: '#ffffff', kite: '#c0553f', warm: '#ffd489',
    layers: ['#c3cfc9', '#a9b8b2', '#8b9c97', '#667874', '#445553', '#263533'] },
  { name: 'ember', sky0: '#fbd7a8', sky1: '#f0a172', sky2: '#e2704b',
    disc: '#ffe9c4', kite: '#2e1a2b', warm: '#ffd08a',
    layers: ['#ee9a6a', '#dd7550', '#c4553f', '#98392f', '#6a2126', '#3a1220'] }
];

const RING_OP = ['.115', '.07'];
const WATER_OP = ['.5', '.4', '.3', '.2'];

function makeRand(seed) {
  let x = seed >>> 0;
  if (x === 0) x = 0x9e3779b9;
  return function (n) {
    x = (x ^ (x << 13)) >>> 0;
    x = (x ^ (x >>> 17)) >>> 0;
    x = (x ^ (x << 5)) >>> 0;
    return x % n;
  };
}

const div = (a, b) => Math.trunc(a / b);

function ridgePoints(rand, base, amp, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    pts.push({ x: div(1000 * i, n), y: base - div(amp * rand(1000), 1000) });
  }
  return pts;
}

function smoothRidge(p) {
  let d = 'M0,' + p[0].y;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1];
    const p3 = p[Math.min(p.length - 1, i + 2)];
    d += 'C' + (p1.x + div(p2.x - p0.x, 6)) + ',' + (p1.y + div(p2.y - p0.y, 6)) +
         ' ' + (p2.x - div(p3.x - p1.x, 6)) + ',' + (p2.y - div(p3.y - p1.y, 6)) +
         ' ' + p2.x + ',' + p2.y;
  }
  return d;
}

function peakedRidge(p) {
  let d = 'M0,' + p[0].y;
  for (let i = 1; i < p.length; i++) d += 'L' + p[i].x + ',' + p[i].y;
  return d;
}

const closeDown = d => d + 'L1000,1000L0,1000Z';

function conifer(x, groundY, h, color) {
  const w = div(h * 42, 100);
  let s = '<g fill="' + color + '">';
  for (let i = 0; i < 3; i++) {
    const top = groundY - h + div(h * 29, 100) * i;
    const half = div(w * (55 + 22 * i), 200);
    const bot = top + div(h * 44, 100);
    s += '<path d="M' + x + ',' + top + 'L' + (x + half) + ',' + bot +
         'L' + (x - half) + ',' + bot + 'Z"/>';
  }
  return s + '<rect x="' + (x - div(h * 3, 100)) + '" y="' + (groundY - div(h * 12, 100)) +
    '" width="' + div(h * 6, 100) + '" height="' + div(h * 13, 100) + '"/></g>';
}

function cottage(x, groundY, color, warm) {
  const bw = 62, bh = 46, rh = 34;
  const top = groundY - bh;
  return '<g><path d="M' + (x - div(bw, 2) - 10) + ',' + top +
    'L' + x + ',' + (top - rh) + 'L' + (x + div(bw, 2) + 10) + ',' + top +
    'Z" fill="' + color + '"/>' +
    '<rect x="' + (x - div(bw, 2)) + '" y="' + top + '" width="' + bw +
    '" height="' + bh + '" fill="' + color + '"/>' +
    '<rect x="' + (x - 9) + '" y="' + (top + 12) + '" width="18" height="16" fill="' + warm + '"/>' +
    '<rect x="' + (x + div(bw, 2) - 22) + '" y="' + (top - rh - 16) +
    '" width="12" height="22" fill="' + color + '"/></g>';
}

function bird(x, y, s, color) {
  const a = div(s, 2), b = div(s * 6, 10);
  return '<path d="M' + (x - s) + ',' + y + 'q' + a + ',' + (-b) + ' ' + s + ',0q' +
    a + ',' + (-b) + ' ' + s + ',0" fill="none" stroke="' + color +
    '" stroke-width="' + div(s * 22, 100) + '" stroke-linecap="round"/>';
}

function kiteShape(x, y, s, color, dir) {
  const wide = div(s * 62, 100);
  return '<g><path d="M' + x + ',' + (y - s) + 'L' + (x + wide) + ',' + y +
    'L' + x + ',' + (y + s) + 'L' + (x - wide) + ',' + y + 'Z" fill="' + color + '"/>' +
    '<path d="M' + x + ',' + (y - s) + 'L' + x + ',' + (y + s) +
    '" stroke="rgba(255,255,255,.35)" stroke-width="' + div(s * 6, 100) + '"/>' +
    '<path d="M' + x + ',' + (y + s) + 'q' + (div(s * 90, 100) * dir) + ',' + div(s * 80, 100) +
    ' ' + (div(s * 20, 100) * dir) + ',' + div(s * 180, 100) +
    'q' + (-(div(s * 80, 100) * dir)) + ',' + div(s * 70, 100) +
    ' ' + (div(s * 10, 100) * dir) + ',' + div(s * 150, 100) +
    '" fill="none" stroke="' + color + '" stroke-width="' + div(s * 11, 100) +
    '" stroke-linecap="round"/></g>';
}

function roll(seed) {
  const rand = makeRand(seed);
  const s = {};
  s.stock = rand(6);
  s.layerCount = 4 + rand(3);
  s.hasKite = rand(100) < 34;
  s.birdCount = rand(100) < 55 ? 2 + rand(4) : 0;
  s.hasWater = rand(100) < 34;
  s.hasFog = rand(100) < 45;
  s.discR = 55 + rand(85);
  s.discX = 180 + rand(640);
  s.discY = 180 + rand(170);
  s.rings = rand(100) < 40 ? 2 : 0;
  s.hasCottage = rand(100) < 38;
  return { s, rand };
}

function traitsOf(s) {
  const t = [STOCKS[s.stock].name, s.layerCount + ' layers'];
  if (s.hasKite) t.push('kite');
  if (s.hasCottage) t.push('cottage');
  if (s.hasWater) t.push('water');
  if (s.hasFog) t.push('fog');
  return t.join(', ');
}

function render(seed) {
  const { s, rand } = roll(seed);
  const st = STOCKS[s.stock];
  const g = 's' + seed;

  let out = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs>' +
    '<linearGradient id="a' + g + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="' + st.sky0 + '"/>' +
    '<stop offset="0.55" stop-color="' + st.sky1 + '"/>' +
    '<stop offset="1" stop-color="' + st.sky2 + '"/></linearGradient>' +
    '<radialGradient id="b' + g + '">' +
    '<stop offset="0" stop-color="' + st.disc + '" stop-opacity=".55"/>' +
    '<stop offset="1" stop-color="' + st.disc + '" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="c' + g + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#ffffff" stop-opacity="0"/>' +
    '<stop offset="0.5" stop-color="#ffffff" stop-opacity=".26"/>' +
    '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>' +
    '<radialGradient id="v' + g + '">' +
    '<stop offset="0.6" stop-color="#000000" stop-opacity="0"/>' +
    '<stop offset="1" stop-color="#000000" stop-opacity=".26"/></radialGradient>' +
    '<filter id="n' + g + '"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3"/>' +
    '</filter></defs>' +
    '<rect width="1000" height="1000" fill="url(#a' + g + ')"/>' +
    '<circle cx="' + s.discX + '" cy="' + s.discY + '" r="' + (s.discR * 3) +
    '" fill="url(#b' + g + ')"/>';

  for (let i = 1; i <= s.rings; i++) {
    out += '<circle cx="' + s.discX + '" cy="' + s.discY + '" r="' + (s.discR + i * 34) +
      '" fill="none" stroke="' + st.disc + '" stroke-opacity="' + RING_OP[i - 1] +
      '" stroke-width="2"/>';
  }
  out += '<circle cx="' + s.discX + '" cy="' + s.discY + '" r="' + s.discR +
    '" fill="' + st.disc + '"/>';

  for (let i = 0; i < s.birdCount; i++) {
    out += bird(120 + rand(760), 200 + rand(260), 11 + rand(9), st.layers[5]);
  }

  if (s.hasKite) {
    const kx = 200 + rand(600), ky = 250 + rand(190), ks = 34 + rand(20);
    const dir = rand(2) === 0 ? 1 : -1;
    out += '<path d="M' + kx + ',' + ky + 'L' + (kx - 120) + ',' + (ky + 300) +
      '" stroke="' + st.layers[5] + '" stroke-opacity=".45" stroke-width="2" fill="none"/>' +
      kiteShape(kx, ky, ks, st.kite, dir);
  }

  const step = div(400, s.layerCount - 1);
  const fogAt = div(s.layerCount, 2);

  for (let i = 0; i < s.layerCount; i++) {
    const base = 430 + step * i;
    const angular = i < 2 && rand(100) < 60;
    const n = angular ? 5 + rand(4) : 4 + rand(3);
    const amp = angular ? 150 - i * 22 : 92 - i * 12;
    const pts = ridgePoints(rand, base, amp, n);
    const ridge = angular ? peakedRidge(pts) : smoothRidge(pts);
    const fill = st.layers[div(i * 5, s.layerCount - 1)];

    out += '<path d="' + closeDown(ridge) + '" transform="translate(0,-9)" fill="rgba(0,0,0,.17)"/>' +
      '<path d="' + closeDown(ridge) + '" fill="' + fill + '"/>' +
      '<path d="' + ridge + '" fill="none" stroke="rgba(255,255,255,.20)" stroke-width="2"/>';

    if (s.hasFog && i === fogAt) {
      out += '<rect x="0" y="' + (base - 26) + '" width="1000" height="86" fill="url(#c' + g + ')"/>';
    }
    if (i === s.layerCount - 2) {
      const trees = 3 + rand(6);
      const tcol = st.layers[div((i + 1) * 5, s.layerCount - 1)];
      const groundY = base + div(step * 55, 100);
      for (let t = 0; t < trees; t++) {
        out += conifer(60 + rand(880), groundY, 46 + rand(54), tcol);
      }
      if (s.hasCottage) {
        out += cottage(150 + rand(700), groundY, tcol, st.warm);
      }
    }
  }

  if (s.hasWater) {
    out += '<rect x="0" y="880" width="1000" height="120" fill="' + st.layers[1] + '" opacity=".85"/>';
    for (let i = 0; i < 4; i++) {
      const lw = 150 - i * 26;
      out += '<rect x="' + (s.discX - div(lw, 2)) + '" y="' + (896 + i * 22) +
        '" width="' + lw + '" height="6" fill="' + st.disc +
        '" opacity="' + WATER_OP[i] + '"/>';
    }
  }

  out += '<rect width="1000" height="1000" filter="url(#n' + g + ')" opacity=".07"/>' +
    '<rect width="1000" height="1000" fill="url(#v' + g + ')"/></svg>';

  return { svg: out, traits: traitsOf(s) };
}

module.exports = { render, STOCKS };
