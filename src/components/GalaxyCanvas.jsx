import { useEffect, useRef } from "react";

/*
 * A spiral galaxy drawn from a few thousand particles.
 *
 *  - Loading: particles spiral in from a loose cloud and settle into three
 *    arms around a warm core, driven by `progress` (a 0–100 motion value).
 *  - Interaction: the disc tilts toward the pointer, stars part around the
 *    cursor, and a click sends a ripple through the field.
 *  - Exit: the camera dives into the core.
 *
 * Particles live in galaxy space (radius, angle) and are projected each
 * frame, so differential rotation is just angle += speed(radius) * time.
 */

const ARMS = 3;
const TWIST = 5.2; // radians of spiral over the full radius
const BASE_TILT = 1.06; // 0 = face-on, π/2 = edge-on
const BASE_ROT = -0.5;
const LENS_RADIUS = 120; // px around the cursor that stars part around

// [r, g, b] — a warm core fading to cool blue arms, with sparse pink star-forming knots.
const COLORS = [
  [255, 232, 196],
  [222, 232, 255],
  [150, 182, 255],
  [255, 172, 206],
];
const ALPHAS = [0.34, 0.62, 0.95];
const SIZES = [1, 1.25, 1.9];

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

const smooth = (v) => v * v * (3 - 2 * v);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const omega = (r) => 0.1 / Math.pow(0.2 + r, 0.75);

function buildGalaxy(count) {
  const rand = rng(11);
  const gauss = () => (rand() + rand() + rand() + rand() - 2) / 0.58;
  const items = [];

  for (let i = 0; i < count; i++) {
    const bulge = rand() < 0.16;
    let r;
    let theta;
    let dr;
    let h = 0;
    if (bulge) {
      r = Math.pow(rand(), 2.1) * 0.27;
      theta = rand() * Math.PI * 2;
      dr = gauss() * 0.02;
      h = gauss() * 0.07;
    } else {
      r = 0.03 + Math.pow(rand(), 1.55) * 0.97;
      const arm = Math.floor(rand() * ARMS);
      const spread = 0.04 + 0.27 * (1 - r * 0.5);
      theta = (arm * Math.PI * 2) / ARMS + r * TWIST + gauss() * spread;
      dr = gauss() * 0.02;
      h = gauss() * 0.012;
    }

    let color = r < 0.2 ? 0 : r < 0.58 ? 1 : 2;
    if (!bulge && r > 0.28 && r < 0.92 && rand() < 0.06) color = 3;
    const a = rand();
    const alpha = a < 0.55 ? 0 : a < 0.88 ? 1 : 2;
    items.push({ r, dr, theta, h, s1: rand(), s2: rand(), bucket: color * 3 + alpha, cloud: !bulge && alpha === 1 && rand() < 0.1 });
  }

  // Group by bucket so each colour/alpha is a contiguous run — one fillStyle per run.
  items.sort((p, q) => p.bucket - q.bucket);
  const n = items.length;
  const g = {
    n,
    r: new Float32Array(n),
    dr: new Float32Array(n),
    theta: new Float32Array(n),
    h: new Float32Array(n),
    s1: new Float32Array(n),
    s2: new Float32Array(n),
    cloud: new Uint8Array(n),
    runs: [],
  };
  items.forEach((p, i) => {
    g.r[i] = p.r;
    g.dr[i] = p.dr;
    g.theta[i] = p.theta;
    g.h[i] = p.h;
    g.s1[i] = p.s1;
    g.s2[i] = p.s2;
    g.cloud[i] = p.cloud ? 1 : 0;
    const last = g.runs[g.runs.length - 1];
    if (last && last.bucket === p.bucket) last.end = i + 1;
    else g.runs.push({ bucket: p.bucket, start: i, end: i + 1 });
  });
  return g;
}

function buildStars(count) {
  const rand = rng(5);
  return Array.from({ length: count }, () => ({
    x: rand(),
    y: rand(),
    z: 0.2 + rand() * 0.8,
    phase: rand() * 6.28,
    speed: 0.5 + rand() * 1.5,
  }));
}

function dustSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(150,175,255,1)");
  grad.addColorStop(0.4, "rgba(110,135,235,0.4)");
  grad.addColorStop(1, "rgba(90,110,220,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

export default function GalaxyCanvas({ progress, exiting, still }) {
  const canvasRef = useRef(null);
  const exitingRef = useRef(exiting);
  exitingRef.current = exiting;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const small = window.innerWidth < 700;
    const galaxy = buildGalaxy(small ? 3000 : 6500);
    const stars = buildStars(small ? 90 : 190);
    const dust = dustSprite();

    let W = 0;
    let H = 0;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let clock = 0;
    let exitStart = null;

    const pointer = { x: 0, y: 0, nx: 0, ny: 0, active: false, sx: 0, sy: 0, snx: 0, sny: 0 };
    let tilt = BASE_TILT;
    let rot = BASE_ROT;
    const ripples = [];

    const draw = (dt, p, exitT) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      // smooth the pointer so the lens glides instead of snapping
      const k = Math.min(1, dt * 7);
      pointer.sx += (pointer.x - pointer.sx) * k;
      pointer.sy += (pointer.y - pointer.sy) * k;
      pointer.snx += ((pointer.active ? pointer.nx : 0) - pointer.snx) * Math.min(1, dt * 3);
      pointer.sny += ((pointer.active ? pointer.ny : 0) - pointer.sny) * Math.min(1, dt * 3);
      tilt = BASE_TILT + pointer.sny * 0.2 + Math.sin(clock * 0.35) * 0.03;
      rot = BASE_ROT + pointer.snx * 0.3;

      const cx = W / 2;
      const cy = H * (W < 700 ? 0.4 : 0.47);
      const S = Math.min(W, H * 1.3) * 0.43;
      const zoom = 1 + 18 * exitT * exitT * exitT;
      const squash = Math.cos(tilt);
      const sinT = Math.sin(tilt);
      const cosA = Math.cos(rot);
      const sinA = Math.sin(rot);
      const formed = smooth(clamp01(p));
      const boost = 1 + exitT * 0.8;

      // background stars with a touch of parallax
      for (const s of stars) {
        const tw = 0.55 + 0.45 * Math.sin(clock * s.speed + s.phase);
        const x = s.x * W - pointer.snx * 16 * s.z;
        const y = s.y * H - pointer.sny * 12 * s.z;
        ctx.globalAlpha = Math.min(1, 0.55 * s.z * tw * (0.4 + 0.6 * formed) * (1 - exitT * 0.6));
        ctx.fillStyle = "#dfe6ff";
        ctx.fillRect(x, y, 1.1 * s.z + 0.3, 1.1 * s.z + 0.3);
      }

      // soft halo behind the disc
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(1, Math.max(0.28, squash));
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, S * zoom * 1.05);
      halo.addColorStop(0, "rgba(120,150,255,0.20)");
      halo.addColorStop(0.5, "rgba(95,115,230,0.07)");
      halo.addColorStop(1, "rgba(80,100,220,0)");
      ctx.globalAlpha = formed;
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, S * zoom * 1.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ripple bookkeeping
      for (let i = ripples.length - 1; i >= 0; i--) if (clock - ripples[i].t0 > 1.3) ripples.splice(i, 1);

      // particles
      const lens = pointer.active && exitT === 0;
      const R2 = LENS_RADIUS * LENS_RADIUS;
      for (const run of galaxy.runs) {
        const color = COLORS[(run.bucket / 3) | 0];
        const alphaClass = run.bucket % 3;
        const baseA = ALPHAS[alphaClass];
        const size = SIZES[alphaClass];
        ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;

        for (let i = run.start; i < run.end; i++) {
          const r0 = galaxy.r[i];
          // each particle settles at its own pace: late ones are still arriving
          const f = 1 - (1 - clamp01(p * 1.4 - galaxy.s1[i] * 0.4)) ** 3;
          const lag = 1 - f;
          const r = (r0 + galaxy.dr[i]) * (1 + lag * (1.1 + galaxy.s2[i] * 1.6));
          const phi = galaxy.theta[i] + omega(r0) * clock - lag * (2.6 + galaxy.s2[i] * 2.2);
          const gx = r * Math.cos(phi);
          const gy = r * Math.sin(phi);
          const px = gx * cosA - gy * sinA;
          const py = gx * sinA + gy * cosA;

          let sx = cx + px * S * zoom;
          let sy = cy + (py * squash + galaxy.h[i] * sinT) * S * zoom;

          if (lens) {
            const dx = sx - pointer.sx;
            const dy = sy - pointer.sy;
            const d2 = dx * dx + dy * dy;
            if (d2 < R2 && d2 > 0.01) {
              const d = Math.sqrt(d2);
              const push = (1 - d / LENS_RADIUS) ** 2 * 46;
              sx += (dx / d) * push;
              sy += (dy / d) * push;
            }
          }
          for (const rp of ripples) {
            const dx = sx - rp.x;
            const dy = sy - rp.y;
            const d = Math.hypot(dx, dy) || 1;
            const age = clock - rp.t0;
            const off = Math.abs(d - age * 560);
            if (off < 70) {
              const push = (1 - off / 70) ** 2 * 26 * (1 - age / 1.3);
              sx += (dx / d) * push;
              sy += (dy / d) * push;
            }
          }

          if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue;
          ctx.globalAlpha = Math.min(1, baseA * (0.15 + 0.85 * f) * boost);
          ctx.fillRect(sx, sy, size, size);
          if (galaxy.cloud[i]) {
            const sz = (26 + galaxy.s2[i] * 46) * (S / 380) * Math.min(zoom, 4);
            ctx.globalAlpha = 0.06 * (0.15 + 0.85 * f) * boost;
            ctx.drawImage(dust, sx - sz / 2, sy - sz / 2, sz, sz);
            ctx.globalAlpha = Math.min(1, baseA * (0.15 + 0.85 * f) * boost);
          }
        }
      }

      // core glow
      const coreR = S * 0.26 * Math.min(zoom, 6);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      core.addColorStop(0, "rgba(255,244,222,0.8)");
      core.addColorStop(0.18, "rgba(255,226,180,0.4)");
      core.addColorStop(0.55, "rgba(255,200,150,0.14)");
      core.addColorStop(1, "rgba(255,190,140,0)");
      ctx.globalAlpha = formed * (1 - exitT * 0.5);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      // cursor glow
      if (lens) {
        const g = ctx.createRadialGradient(pointer.sx, pointer.sy, 0, pointer.sx, pointer.sy, LENS_RADIUS);
        g.addColorStop(0, "rgba(170,195,255,0.10)");
        g.addColorStop(1, "rgba(170,195,255,0)");
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(pointer.sx, pointer.sy, LENS_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      clock += dt;
      if (exitingRef.current && exitStart === null) exitStart = now;
      const exitT = exitStart === null ? 0 : clamp01((now - exitStart) / 1000);
      draw(dt, progress.get() / 100, exitT);
    };

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      W = Math.round(rect.width);
      H = Math.round(rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      if (still) draw(0, 1, 0);
    };

    const toLocal = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    };
    const onMove = (e) => {
      const p = toLocal(e);
      if (!pointer.active) {
        pointer.sx = p.x;
        pointer.sy = p.y;
      }
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.nx = (p.x / p.w - 0.5) * 2;
      pointer.ny = (p.y / p.h - 0.5) * 2;
      pointer.active = true;
    };
    const onLeave = () => (pointer.active = false);
    const onDown = (e) => {
      const p = toLocal(e);
      ripples.push({ x: p.x, y: p.y, t0: clock });
      onMove(e);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    if (!still) {
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerdown", onDown);
      document.addEventListener("pointerleave", onLeave);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [progress, still]);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}
