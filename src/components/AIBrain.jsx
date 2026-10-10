import { useEffect, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

/*
 * A circuit-board brain with a glowing AI chip at its core, drawn on canvas.
 *
 * World space is x ∈ [-1, 1], y ∈ [-0.8, 0.8] with the chip at the origin.
 * The network (hemispheres, traces, nodes) is generated once from a seeded RNG
 * and baked into an offscreen "static" layer; each frame only draws what moves:
 * signal waves travelling along the traces, node glows, the cursor web and the
 * chip. Signals are pre-computed shortest-path distances, so a wave is just
 * "light everything within `front` units of the source, fading behind it".
 */

const ASPECT = 0.8; // canvas height / width
const CHIP = 0.27; // chip half-size
const HOVER_RADIUS = 0.3;
const AMBIENT_EVERY = 3.4; // seconds between waves fired from the chip

const hueAt = (x) => 195 + ((x + 1) / 2) * 92; // cyan-blue on the left → violet on the right

function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- hemisphere geometry (left hemisphere; the right one is mirrored) ----

const HEMI = { cx: -0.5, ax: 0.5, by: 0.74, n: 2.4 };

function hemiRadius(theta) {
  const c = Math.abs(Math.cos(theta));
  const s = Math.abs(Math.sin(theta));
  const ax = HEMI.ax * (1 + 0.07 * Math.sin(theta)); // wider toward the back
  const r = Math.pow(Math.pow(c / ax, HEMI.n) + Math.pow(s / HEMI.by, HEMI.n), -1 / HEMI.n);
  return r * (1 + 0.032 * Math.sin(5 * theta + 0.6) + 0.02 * Math.sin(9 * theta + 2));
}

const mirror = (side, x) => (side < 0 ? x : -x);

function insideHemi(side, x, y, inset) {
  const dx = mirror(side, x) - HEMI.cx;
  return Math.hypot(dx, y) < hemiRadius(Math.atan2(y, dx)) * inset;
}

function hemiPath(ctx, side, scale = 1) {
  ctx.beginPath();
  for (let i = 0; i <= 180; i++) {
    const t = (i / 180) * Math.PI * 2;
    const r = hemiRadius(t) * scale;
    const x = mirror(side, HEMI.cx + Math.cos(t) * r);
    const y = Math.sin(t) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// ---- network generation ----

function buildNetwork(dense) {
  const rand = rng(7);
  const nodes = [];
  const minDist = dense ? 0.1 : 0.125;

  for (const side of [-1, 1]) {
    let tries = 0;
    while (tries++ < 2500) {
      const x = (rand() * 2 - 1) * 0.98;
      const y = (rand() * 2 - 1) * 0.8;
      if (Math.sign(x) !== side) continue;
      if (!insideHemi(side, x, y, 0.93)) continue;
      if (Math.abs(x) < CHIP + 0.15 && Math.abs(y) < CHIP + 0.15) continue;
      if (nodes.some((n) => Math.hypot(n.x - x, n.y - y) < minDist)) continue;
      nodes.push({ x, y, side, port: false, ring: rand() < 0.3 });
    }
  }

  // Ports sit just outside the chip's pins and are where signals leave the core.
  const portEdge = CHIP + 0.1;
  const spread = [-0.19, -0.1, 0, 0.1, 0.19];
  const topX = [-0.2, -0.1, 0.1, 0.2];
  for (const side of [-1, 1]) {
    for (const y of spread) nodes.push({ x: side * portEdge, y, side, port: true });
    for (const x of topX.filter((v) => Math.sign(v) === side)) {
      nodes.push({ x, y: -portEdge, side, port: true });
      nodes.push({ x, y: portEdge, side, port: true });
    }
  }

  const n = nodes.length;
  const link = new Set();
  const edges = [];
  const add = (i, j) => {
    const key = i < j ? `${i}-${j}` : `${j}-${i}`;
    if (i === j || link.has(key)) return;
    link.add(key);
    edges.push(makeEdge(nodes, i, j));
  };
  const candidates = (i) =>
    nodes
      .map((m, j) => ({ j, d: Math.hypot(m.x - nodes[i].x, m.y - nodes[i].y) }))
      .filter(({ j }) => j !== i && nodes[j].side === nodes[i].side && !(nodes[i].port && nodes[j].port))
      .sort((a, b) => a.d - b.d);

  for (let i = 0; i < n; i++) {
    const k = nodes[i].port ? 2 : 3;
    candidates(i)
      .filter(({ j }) => !nodes[j].port || !nodes[i].port)
      .slice(0, k)
      .forEach(({ j }) => add(i, j));
  }

  // Stitch any islands to the main network so every node can carry a signal.
  const parent = [...Array(n).keys()];
  const find = (a) => (parent[a] === a ? a : (parent[a] = find(parent[a])));
  edges.forEach((e) => (parent[find(e.a)] = find(e.b)));
  for (;;) {
    let best = null;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (find(i) === find(j) || nodes[i].side !== nodes[j].side) continue;
        if (nodes[i].port && nodes[j].port) continue;
        const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        if (!best || d < best.d) best = { i, j, d };
      }
    }
    if (!best) break;
    add(best.i, best.j);
    parent[find(best.i)] = find(best.j);
  }

  // All-pairs path lengths (Floyd–Warshall) → waves can start from any node.
  const D = new Float32Array(n * n).fill(1e9);
  for (let i = 0; i < n; i++) D[i * n + i] = 0;
  edges.forEach((e) => {
    D[e.a * n + e.b] = e.len;
    D[e.b * n + e.a] = e.len;
  });
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      const dik = D[i * n + k];
      if (dik >= 1e9) continue;
      for (let j = 0; j < n; j++) {
        const v = dik + D[k * n + j];
        if (v < D[i * n + j]) D[i * n + j] = v;
      }
    }
  }

  // Distance from the chip: the cheapest port + the gap between chip and port.
  const fromChip = new Float32Array(n).fill(1e9);
  for (let i = 0; i < n; i++) {
    for (let p = 0; p < n; p++) {
      if (!nodes[p].port) continue;
      const lead = Math.max(Math.abs(nodes[p].x), Math.abs(nodes[p].y)) - CHIP;
      fromChip[i] = Math.min(fromChip[i], lead + D[p * n + i]);
    }
  }

  return { nodes, edges, D, fromChip, n, maxChip: Math.max(...fromChip.filter((v) => v < 1e9)) };
}

// A circuit trace: run straight, then a 45° diagonal into the target.
function makeEdge(nodes, a, b) {
  const A = nodes[a];
  const B = nodes[b];
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const mid =
    ax >= ay
      ? { x: A.x + Math.sign(dx) * (ax - ay), y: A.y }
      : { x: A.x, y: A.y + Math.sign(dy) * (ay - ax) };
  const pts = [A, mid, B];
  const l1 = Math.hypot(mid.x - A.x, mid.y - A.y);
  const l2 = Math.hypot(B.x - mid.x, B.y - mid.y);
  return { a, b, pts, cum: [0, l1, l1 + l2], len: l1 + l2, hue: hueAt((A.x + B.x) / 2) };
}

// Trace the portion of an edge between arc-length s0 and s1 (from end `a`).
function tracePart(ctx, e, s0, s1) {
  const { pts, cum } = e;
  let started = false;
  for (let i = 0; i < 2; i++) {
    const lo = Math.max(s0, cum[i]);
    const hi = Math.min(s1, cum[i + 1]);
    if (hi <= lo) continue;
    const seg = cum[i + 1] - cum[i] || 1;
    const p = pts[i];
    const q = pts[i + 1];
    const t0 = (lo - cum[i]) / seg;
    const t1 = (hi - cum[i]) / seg;
    if (!started) ctx.moveTo(p.x + (q.x - p.x) * t0, p.y + (q.y - p.y) * t0);
    ctx.lineTo(p.x + (q.x - p.x) * t1, p.y + (q.y - p.y) * t1);
    started = true;
  }
}

// ---- sprites ----

function glowSprite(hue, size = 64) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `hsla(${hue}, 100%, 78%, 1)`);
  grad.addColorStop(0.25, `hsla(${hue}, 100%, 62%, 0.55)`);
  grad.addColorStop(1, `hsla(${hue}, 100%, 55%, 0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

// ---- component ----

export default function AIBrain({ className = "" }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const reduced = useReducedMotion();

  // 3D tilt of the whole piece toward the pointer.
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const tiltX = useSpring(rx, { stiffness: 90, damping: 18, mass: 0.5 });
  const tiltY = useSpring(ry, { stiffness: 90, damping: 18, mass: 0.5 });

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const net = buildNetwork(window.innerWidth > 640);
    const { nodes, edges, D, fromChip, n } = net;
    const sprites = {};
    const spriteFor = (hue) => (sprites[Math.round(hue / 6)] ??= glowSprite(Math.round(hue / 6) * 6));

    let w = 0;
    let h = 0;
    let dpr = 1;
    let s = 1; // world → CSS pixels
    let statik = null;

    const pointer = { x: 0, y: 0, active: false };
    const chip = { hover: 0, press: 0, rings: [] };
    const waves = [];
    let raf = 0;
    let running = false;
    let last = 0;
    let clock = 0;
    let nextAmbient = 0.6;
    let nextSpark = 0.3;

    const world = (clientX, clientY) => {
      const r = canvas.getBoundingClientRect();
      return { x: (clientX - r.left - w / 2) / s, y: (clientY - r.top - h / 2) / s, r };
    };

    const fireChipWave = (strength = 1) =>
      waves.push({ dist: fromChip, t0: clock, speed: 0.95, tail: 0.3, strength, life: net.maxChip / 0.95 + 1.4 });

    const fireFromNode = (i, strength = 0.85) =>
      waves.push({ dist: D.subarray(i * n, i * n + n), t0: clock, speed: 1.1, tail: 0.24, strength, life: 2.6 });

    const nearestNode = (x, y) => {
      let best = 0;
      let bd = Infinity;
      nodes.forEach((m, i) => {
        if (m.port) return;
        const d = Math.hypot(m.x - x, m.y - y);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      return best;
    };

    // ---- static layer: outlines, dim traces, dim nodes ----
    const bakeStatic = () => {
      statik = document.createElement("canvas");
      statik.width = Math.round(w * dpr);
      statik.height = Math.round(h * dpr);
      const g = statik.getContext("2d");
      g.setTransform(dpr * s, 0, 0, dpr * s, (dpr * w) / 2, (dpr * h) / 2);
      const px = 1 / s;
      g.lineJoin = "round";
      g.lineCap = "round";

      for (const side of [-1, 1]) {
        const x0 = side * 0.5 - 0.5;
        const grad = g.createLinearGradient(x0 - 0.5, -0.8, x0 + 0.5, 0.8);
        const hue = side < 0 ? 205 : 280;
        grad.addColorStop(0, `hsla(${hue}, 100%, 62%, 0.07)`);
        grad.addColorStop(1, `hsla(${hue + 25}, 100%, 55%, 0.015)`);
        hemiPath(g, side);
        g.fillStyle = grad;
        g.fill();
      }

      edges.forEach((e) => {
        g.beginPath();
        tracePart(g, e, 0, e.len);
        g.strokeStyle = `hsla(${e.hue}, 95%, 62%, 0.4)`;
        g.lineWidth = 1.25 * px;
        g.stroke();
      });

      for (const side of [-1, 1]) {
        const hue = side < 0 ? 200 : 285;
        hemiPath(g, side, 0.955);
        g.strokeStyle = `hsla(${hue}, 100%, 65%, 0.2)`;
        g.lineWidth = 1 * px;
        g.stroke();
        hemiPath(g, side);
        g.strokeStyle = `hsla(${hue}, 100%, 62%, 0.22)`;
        g.lineWidth = 7 * px;
        g.stroke();
        g.strokeStyle = `hsla(${hue}, 100%, 78%, 0.95)`;
        g.lineWidth = 1.8 * px;
        g.stroke();
      }

      nodes.forEach((m) => {
        const hue = hueAt(m.x);
        if (m.ring) {
          g.beginPath();
          g.arc(m.x, m.y, 5.5 * px, 0, Math.PI * 2);
          g.strokeStyle = `hsla(${hue}, 100%, 72%, 0.9)`;
          g.lineWidth = 1.4 * px;
          g.stroke();
        } else {
          g.beginPath();
          g.arc(m.x, m.y, (m.port ? 2.2 : 2.8) * px, 0, Math.PI * 2);
          g.fillStyle = `hsla(${hue}, 100%, 78%, ${m.port ? 0.7 : 0.9})`;
          g.fill();
        }
      });
    };

    // ---- chip ----
    const drawChip = (t) => {
      const lift = 1 + 0.055 * chip.hover - 0.04 * chip.press;
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.8);
      const energy = Math.min(1, 0.45 + 0.25 * pulse + 0.45 * chip.hover + 0.5 * chip.press);
      const px = 1 / s;

      ctx.save();
      ctx.scale(lift, lift);

      // bloom behind the chip
      const bloom = ctx.createRadialGradient(0, 0, CHIP * 0.5, 0, 0, CHIP * 2.5);
      bloom.addColorStop(0, `hsla(250, 100%, 66%, ${0.5 * energy})`);
      bloom.addColorStop(0.5, `hsla(235, 100%, 60%, ${0.16 * energy})`);
      bloom.addColorStop(1, "hsla(235, 100%, 60%, 0)");
      ctx.fillStyle = bloom;
      ctx.fillRect(-CHIP * 2.6, -CHIP * 2.6, CHIP * 5.2, CHIP * 5.2);

      // pins
      const pins = 11;
      const pinLen = 0.05;
      const pinW = 0.013;
      for (let i = 0; i < pins; i++) {
        const u = -CHIP + 0.045 + (i / (pins - 1)) * (CHIP * 2 - 0.09);
        const live = 0.5 + 0.5 * Math.sin(t * 3 - i * 0.7 + (chip.press ? 6 : 0));
        const a = 0.55 + 0.4 * live * energy;
        ctx.fillStyle = `hsla(${hueAt(u * 0.8)}, 100%, 72%, ${a})`;
        ctx.fillRect(u - pinW / 2, -CHIP - pinLen + 0.004, pinW, pinLen); // top
        ctx.fillRect(u - pinW / 2, CHIP - 0.004, pinW, pinLen); // bottom
        ctx.fillStyle = `hsla(${hueAt(-CHIP)}, 100%, 72%, ${a})`;
        ctx.fillRect(-CHIP - pinLen + 0.004, u - pinW / 2, pinLen, pinW); // left
        ctx.fillStyle = `hsla(${hueAt(CHIP)}, 100%, 72%, ${a})`;
        ctx.fillRect(CHIP - 0.004, u - pinW / 2, pinLen, pinW); // right
      }

      // body
      const r = 0.04;
      ctx.beginPath();
      ctx.roundRect(-CHIP, -CHIP, CHIP * 2, CHIP * 2, r);
      const body = ctx.createLinearGradient(-CHIP, -CHIP, CHIP, CHIP);
      body.addColorStop(0, "#071027");
      body.addColorStop(1, "#14082c");
      ctx.fillStyle = body;
      ctx.fill();
      const rim = ctx.createLinearGradient(-CHIP, -CHIP, CHIP, CHIP);
      rim.addColorStop(0, `hsla(195, 100%, ${60 + 18 * energy}%, 1)`);
      rim.addColorStop(1, `hsla(285, 100%, ${62 + 16 * energy}%, 1)`);
      ctx.strokeStyle = rim;
      ctx.lineWidth = 6 * px;
      ctx.globalAlpha = 0.28 + 0.3 * energy;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2.2 * px;
      ctx.stroke();

      // inner glow wash
      const inner = ctx.createRadialGradient(0, 0, 0, 0, 0, CHIP * 1.1);
      inner.addColorStop(0, `hsla(235, 100%, 62%, ${0.28 * energy})`);
      inner.addColorStop(1, "hsla(235, 100%, 62%, 0)");
      ctx.fillStyle = inner;
      ctx.beginPath();
      ctx.roundRect(-CHIP, -CHIP, CHIP * 2, CHIP * 2, r);
      ctx.fill();

      // "AI" — white with a travelling cyan→violet sheen
      const fs = CHIP * 1.2;
      ctx.font = `800 ${fs}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const tw = ctx.measureText("AI").width;
      const sweep = ((t * 0.28) % 1.6) - 0.3;
      const text = ctx.createLinearGradient(-tw / 2, 0, tw / 2, 0);
      const stop = (v) => Math.min(1, Math.max(0, v));
      text.addColorStop(0, "#ffffff");
      text.addColorStop(stop(sweep - 0.22), "#ffffff");
      text.addColorStop(stop(sweep), "#8fe3ff");
      text.addColorStop(stop(sweep + 0.22), "#ffffff");
      text.addColorStop(1, "#ffffff");
      ctx.shadowColor = `hsla(${215 + 40 * pulse}, 100%, 65%, ${0.9 * energy + 0.1})`;
      ctx.shadowBlur = (14 + 18 * energy) * dpr;
      ctx.fillStyle = text;
      ctx.fillText("AI", 0, fs * 0.04);
      ctx.shadowBlur = 0;

      ctx.restore();

      // shockwave rings fired by clicking the core
      chip.rings.forEach((ring) => {
        const k = (t - ring.t0) / 1.1;
        if (k >= 1) return;
        ctx.beginPath();
        ctx.arc(0, 0, CHIP * (1 + k * 3.6), 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${230 + k * 50}, 100%, 72%, ${0.7 * (1 - k) ** 2})`;
        ctx.lineWidth = (2.5 - k * 1.5) * px;
        ctx.stroke();
      });
    };

    // ---- frame ----
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      clock += dt;
      render(dt);
    };

    const render = (dt) => {
      const px = 1 / s;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(statik, 0, 0, w, h);

      ctx.setTransform(dpr * s, 0, 0, dpr * s, (dpr * w) / 2, (dpr * h) / 2);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = "lighter";

      // pointer hover + chip state
      const overChip = pointer.active && Math.abs(pointer.x) < CHIP * 1.15 && Math.abs(pointer.y) < CHIP * 1.15;
      chip.hover += ((overChip ? 1 : 0) - chip.hover) * Math.min(1, dt * 9);
      chip.press += (0 - chip.press) * Math.min(1, dt * 4);
      chip.rings = chip.rings.filter((r) => clock - r.t0 < 1.1);
      wrap.style.cursor = overChip ? "pointer" : "";

      // ambient activity
      if (clock > nextAmbient) {
        fireChipWave(0.75);
        nextAmbient = clock + AMBIENT_EVERY;
      }
      if (clock > nextSpark) {
        const i = (Math.random() * n) | 0;
        waves.push({ dist: D.subarray(i * n, i * n + n), t0: clock, speed: 0.8, tail: 0.09, strength: 0.55, life: 0.9, reach: 0.35 });
        nextSpark = clock + 0.12 + Math.random() * 0.25;
      }

      // node activation + lit edges from every live wave
      const act = new Float32Array(n);
      for (let wi = waves.length - 1; wi >= 0; wi--) {
        const wv = waves[wi];
        const age = clock - wv.t0;
        if (age > wv.life) {
          waves.splice(wi, 1);
          continue;
        }
        const fade = age < wv.life * 0.75 ? 1 : 1 - (age - wv.life * 0.75) / (wv.life * 0.25);
        const front = age * wv.speed;
        const amp = wv.strength * fade;
        const reach = wv.reach ?? Infinity;

        for (let i = 0; i < n; i++) {
          const d = wv.dist[i];
          if (d > reach || d > front) continue;
          const v = amp * Math.exp(-(front - d) / wv.tail);
          if (v > act[i]) act[i] = v;
        }

        edges.forEach((e) => {
          const da = wv.dist[e.a];
          const db = wv.dist[e.b];
          const fromA = da <= db;
          const d0 = fromA ? da : db;
          if (d0 > front || d0 > reach) return;
          const s1 = Math.min(e.len, front - d0);
          const s0 = Math.max(0, s1 - wv.tail * 2.6);
          const mid = d0 + (s0 + s1) / 2;
          const v = amp * Math.exp(-(front - mid) / wv.tail);
          if (v < 0.03) return;
          ctx.beginPath();
          if (fromA) tracePart(ctx, e, s0, s1);
          else tracePart(ctx, e, e.len - s1, e.len - s0);
          ctx.strokeStyle = `hsla(${e.hue}, 100%, 72%, ${Math.min(1, v)})`;
          ctx.lineWidth = 2.4 * px;
          ctx.stroke();
          ctx.strokeStyle = `hsla(${e.hue}, 100%, 60%, ${Math.min(1, v) * 0.3})`;
          ctx.lineWidth = 7 * px;
          ctx.stroke();
        });
      }

      // cursor web: nodes near the pointer wake up and tether to it
      if (pointer.active && !overChip) {
        const near = [];
        nodes.forEach((m, i) => {
          const d = Math.hypot(m.x - pointer.x, m.y - pointer.y);
          if (d < HOVER_RADIUS) {
            const k = (1 - d / HOVER_RADIUS) ** 1.6;
            act[i] = Math.max(act[i], k);
            near.push({ i, d });
          }
        });
        near.sort((p, q) => p.d - q.d);
        near.slice(0, 4).forEach(({ i, d }) => {
          const m = nodes[i];
          ctx.beginPath();
          ctx.moveTo(pointer.x, pointer.y);
          ctx.lineTo(m.x, m.y);
          ctx.strokeStyle = `hsla(${hueAt(m.x)}, 100%, 80%, ${0.5 * (1 - d / HOVER_RADIUS)})`;
          ctx.lineWidth = 1.1 * px;
          ctx.stroke();
        });
        const halo = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, HOVER_RADIUS);
        halo.addColorStop(0, `hsla(${hueAt(pointer.x)}, 100%, 70%, 0.14)`);
        halo.addColorStop(1, "hsla(220, 100%, 70%, 0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, HOVER_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      // node glows
      for (let i = 0; i < n; i++) {
        const a = act[i];
        if (a < 0.04) continue;
        const m = nodes[i];
        const size = (14 + 30 * a) * px;
        ctx.globalAlpha = Math.min(1, a * 1.1);
        ctx.drawImage(spriteFor(hueAt(m.x)), m.x - size / 2, m.y - size / 2, size, size);
        ctx.globalAlpha = Math.min(1, a * 1.4);
        ctx.beginPath();
        ctx.arc(m.x, m.y, (2.6 + 2.4 * a) * px, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.globalCompositeOperation = "source-over";
      drawChip(clock);
    };

    // ---- sizing ----
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      w = Math.max(240, Math.round(rect.width));
      h = Math.round(w * ASPECT);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      s = w / 2.12;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      bakeStatic();
      if (reduced || !running) renderStill();
    };

    // reduced motion / offscreen: a single frame with the network softly lit
    const renderStill = () => {
      if (!statik) return;
      if (!waves.length) fireChipWave(0.85);
      clock = 0.5 * (net.maxChip / 0.95);
      render(0);
    };

    // ---- input ----
    const onMove = (e) => {
      const p = world(e.clientX, e.clientY);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.active = true;
      const nx = (e.clientX - p.r.left) / p.r.width - 0.5;
      const ny = (e.clientY - p.r.top) / p.r.height - 0.5;
      rx.set(-ny * 12);
      ry.set(nx * 14);
    };
    const onLeave = () => {
      pointer.active = false;
      rx.set(0);
      ry.set(0);
    };
    const onDown = (e) => {
      const p = world(e.clientX, e.clientY);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.active = true;
      if (Math.abs(p.x) < CHIP * 1.15 && Math.abs(p.y) < CHIP * 1.15) {
        chip.press = 1;
        chip.rings.push({ t0: clock });
        fireChipWave(1.15);
        nextAmbient = clock + AMBIENT_EVERY;
      } else {
        fireFromNode(nearestNode(p.x, p.y));
      }
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onDown);

    const start = () => {
      if (running || reduced) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    let inView = false;
    const sync = () => (inView && !document.hidden ? start() : stop());
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    }, { threshold: 0.05 });
    io.observe(wrap);
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    document.addEventListener("visibilitychange", sync);
    document.fonts?.ready.then(() => {
      if (statik && (reduced || !running)) renderStill();
    });

    resize();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", sync);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
    };
  }, [reduced, rx, ry]);

  return (
    <div ref={wrapRef} className={`relative mx-auto w-full max-w-[760px] ${className}`} data-cursor="hover">
      {/* ambient bloom behind the brain */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[-8%] -z-10"
        style={{
          background:
            "radial-gradient(ellipse 45% 42% at 30% 50%, rgba(40,130,255,0.22), transparent 70%), radial-gradient(ellipse 45% 42% at 70% 50%, rgba(160,70,255,0.22), transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <motion.div style={{ rotateX: tiltX, rotateY: tiltY, transformPerspective: 1100 }} className="will-change-transform">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Glowing circuit-board brain with an AI chip at its centre. Move the pointer over it to wake the neurons; click the chip to send a signal through the network."
          className="block w-full touch-pan-y select-none"
          style={{ aspectRatio: `1 / ${ASPECT}` }}
        />
      </motion.div>
    </div>
  );
}
