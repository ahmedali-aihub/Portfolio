import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, useSpring, useTransform } from "framer-motion";

/*
 * A link-button that shoots a web at your cursor and reels it in.
 *
 * Inside `radius` px the button fires a net of silk from its near edge to the
 * pointer, then drags the drawn cursor toward itself: the hand is pulled off
 * the real mouse position by a growing offset, so you feel the tug even though
 * the OS pointer never moves. The hand is reeled up to a short distance from
 * the button's rim and no further, and once the pointer is over the button the
 * offset is zero, so what you see and what you click are the same place. The
 * button itself only leans a little toward you. Touch and reduced-motion users
 * get a plain link.
 *
 * The cursor offset is published on `window.__webPull` (a single shared slot,
 * claimed by whichever button is closest) and consumed by CustomCursor.
 */

const STRANDS = 9; // odd, so the middle strand lands exactly on the hand
const PAD = 560; // px of SVG bleed, so a web fired across the viewport is not clipped
const CATCH = 0.55; // fraction of the gap the cursor gets dragged across at full grip
const GAP = 26; // px the held fingertip is kept clear of the button's rim
// The hand stands this far below its fingertip (the click point). When it is held
// above a button, that much more room is needed or its body hangs over the label.
const HAND_LEN = 46;
// The most the drawn hand is ever hauled off the real pointer. Far away the
// pull is capped, so the web stays taut and stretchy, and the hand never ends
// up so far from the pointer that aiming with it becomes guesswork.
const MAX_PULL = 150;

// `radius` is how far from the button the web will reach. The default covers the
// whole contact section, so wherever the pointer is in it, the nearest button
// fires at it. The web still only exists while the pointer is inside the section.
export default function PullButton({ children, className = "", glowClassName = "", radius = 760, lean = 22, ...props }) {
  const wrapRef = useRef(null);
  const [box, setBox] = useState(null);
  const [web, setWeb] = useState(false);

  // Where the fingertip is being held, relative to the button's resting centre.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  // How far the web has been shot out: 0 is folded against the button, 1 is
  // reaching the fingertip. It is a spring, and deliberately underdamped, so the
  // strands overshoot the hand a little when fired and whip back past the button
  // when released, which is most of what makes the web feel elastic.
  const extent = useMotionValue(0);
  const sextent = useSpring(extent, { stiffness: 150, damping: 11, mass: 0.9 });

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const glow = useMotionValue(0);

  const spring = { stiffness: 170, damping: 15, mass: 0.6 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);
  const sg = useSpring(glow, { stiffness: 120, damping: 20 });
  // It tips toward the pull, mostly sideways, a little more when pulled down.
  const rotate = useTransform([sx, sy], ([a, b]) => a * 0.36 + b * 0.1);

  // Keep the web mounted until the spring has settled, so the snap-back is seen.
  useMotionValueEvent(sextent, "change", (v) => setWeb(Math.abs(v) > 0.004));

  useEffect(() => {
    const el = wrapRef.current;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width) setBox({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (reduced || !fine) return undefined;
    const el = wrapRef.current;
    // The web only exists inside the zone the button belongs to: a marked stage
    // if there is one, else its section.
    const zone = el.closest("[data-pull-zone]") || el.closest("section");
    const slot = (window.__webPull ||= { owner: null, x: 0, y: 0, grip: 0, dir: null });
    const me = {};

    const release = () => {
      extent.set(0);
      x.set(0);
      y.set(0);
      glow.set(0);
      if (slot.owner === me) {
        slot.owner = null;
        slot.x = 0;
        slot.y = 0;
        slot.grip = 0;
      }
    };
    // Lets a nearer button make this one let go when it takes the cursor.
    me.release = release;

    // The pointer's last known position. `pointermove` does not fire when the
    // page scrolls under a still pointer, yet the pointer's place relative to
    // the buttons changes just the same, so scrolling has to re-run the update.
    // Without that, scrolling away from the section left the hand pulled off the
    // pointer, and tilted toward buttons that were no longer on screen.
    const last = { x: null, y: null };

    // `stamp` identifies the event, so two buttons handling the same one can
    // tell whose claim is current; `getTarget` is lazy because the hit test is
    // only worth doing once the cheaper checks have passed.
    const update = (cx, cy, stamp, getTarget) => {
      const r = el.getBoundingClientRect();
      const dx = cx - (r.left + r.width / 2);
      const dy = cy - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);
      const reach = radius + r.width / 2;

      if (dist >= reach) {
        release();
        return;
      }
      // Only inside the zone the buttons belong to: the web must not shoot
      // across the page while you are reading something else.
      if (zone) {
        const s = zone.getBoundingClientRect();
        if (cx < s.left || cx > s.right || cy < s.top || cy > s.bottom) {
          release();
          return;
        }
      }
      // Aiming at some other link or button: let go. The drawn hand is pulled
      // off the real pointer, so a click would land away from where it looks.
      const hit = getTarget();
      const over = hit instanceof Element ? hit.closest("a, button, input, textarea, select, [role='button']") : null;
      if (over && !over.closest("[data-pull]")) {
        release();
        return;
      }
      // Claim the shared cursor slot unless a nearer button has claimed it for
      // this same event. Stale claims (from an earlier event) lose.
      if (slot.owner && slot.owner !== me) {
        if (slot.stamp === stamp && slot.dist <= dist) {
          release();
          return;
        }
        // We are taking the cursor from another button: make it drop its web
        // too, or its strands stay drawn at full strength behind ours.
        slot.owner.release();
      }
      slot.owner = me;
      slot.dist = dist;
      slot.stamp = stamp;

      const t = 1 - dist / reach; // 0 at the edge of the field, 1 at the centre
      // Smoothstep, but saturating well before the centre: with a field this
      // wide the grip must already be firm a few hundred px out, or the web is
      // too faint to see from where the pointer usually is.
      const q = Math.min(1, t * 1.8);
      const g = q * q * (3 - 2 * q);

      extent.set(1);
      glow.set(Math.min(1, t * 1.5));

      const ux = dx / (dist || 1);
      const uy = dy / (dist || 1);

      // Distance from the button's centre to its edge along the pull line. The
      // hand is reeled in to GAP px beyond that rim and held there; if the
      // pointer is already inside that ring there is nothing to haul, so the
      // drawn hand stays exactly under the real pointer.
      const rim = 1 / Math.max(Math.abs(ux) / (r.width / 2), Math.abs(uy) / (r.height / 2));
      const stand = rim + GAP + HAND_LEN * Math.max(0, -uy);
      const hauled = dist <= stand ? dist : dist - Math.min(MAX_PULL, (dist - stand) * CATCH * g);

      slot.x = ux * hauled - dx;
      slot.y = uy * hauled - dy;
      slot.grip = g;

      // The strands end where the hand actually ends up.
      px.set(ux * hauled);
      py.set(uy * hauled);

      // The button leans into the pull, far less than the cursor moves.
      const k = Math.min(1, lean / (dist || 1)) * g;
      x.set(dx * k);
      y.set(dy * k);
    };

    const onMove = (e) => {
      last.x = e.clientX;
      last.y = e.clientY;
      update(e.clientX, e.clientY, e.timeStamp, () => e.target);
    };
    const onScroll = (e) => {
      if (last.x === null) return; // the pointer has not been seen yet
      update(last.x, last.y, e.timeStamp, () => document.elementFromPoint(last.x, last.y));
    };
    // Forget the pointer when it leaves, so a later scroll cannot revive a grab.
    const onLeave = () => {
      last.x = null;
      last.y = null;
      release();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      release();
    };
  }, [radius, lean, px, py, extent, x, y, glow]);

  return (
    <div ref={wrapRef} data-pull className="relative isolate inline-block">
      {box && web && <Web box={box} px={px} py={py} reach={sextent} bx={sx} by={sy} rot={rotate} />}
      <motion.span
        aria-hidden="true"
        style={{ x: sx, y: sy, opacity: sg }}
        className={`pointer-events-none absolute -inset-3 -z-10 rounded-full blur-xl ${glowClassName || "bg-[radial-gradient(closest-side,rgba(200,210,255,0.35),transparent)]"}`}
      />
      <motion.a
        style={{ x: sx, y: sy, rotate }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        data-cursor="hover"
        className={`relative inline-flex items-center justify-center will-change-transform ${className}`}
        {...props}
      >
        {children}
      </motion.a>
    </div>
  );
}

const SEG = 13; // points per strand
const HSEG = 7; // points per loose wisp
const STEP = 1 / 60; // the simulation advances in fixed 60Hz steps, whatever the display rate
const GRAVITY = 0.34; // px per step², applied while the web is out
const DAMP = 0.975; // velocity kept per step: low enough to settle, high enough to whip
const PASSES = 4; // constraint passes per step: more is stiffer
const RUNG_AT = [3, 6, 9]; // where the fine web ties neighbouring strands together
const WHIP = 0.1; // how much of the hand's own motion is passed on to the ropes
const INK = "#0a0a0c";

// A deterministic 0..1 value from two seeds, so each strand keeps its own
// character without the web changing from one grab to the next.
const seed = (i, s) => {
  const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

// What makes each strand its own: a few thick cables of black goo and the rest
// fine threads, each with its own slack, weight and lag, so they hang at
// different depths and cross over instead of lying side by side.
const TRAITS = Array.from({ length: STRANDS }, (_, i) => ({
  cable: i % 4 === 0,
  slack: 1.03 + 0.085 * seed(i, 1),
  heavy: 0.8 + 0.55 * seed(i, 2),
  lag: 0.07 + 0.08 * seed(i, 3),
}));

// Loose wisps hanging off the button's lower edge: where along it (as a fraction
// of the half-width), how long, and which way each curls. Short and clustered
// toward one end, as in the video, not whiskers across the whole edge.
const HAIRS = [
  { f: -0.56, len: 17, curl: 1 },
  { f: -0.44, len: 25, curl: -1 },
  { f: -0.32, len: 15, curl: 1 },
  { f: -0.62, len: 12, curl: -1 },
];

// Drops of the goo that creep along particular strands: strand, start, speed, radius.
const BEADS = [
  { s: 0, at: 0.12, speed: 0.06, r: 3.0 },
  { s: 4, at: 0.5, speed: -0.05, r: 3.4 },
  { s: 2, at: 0.3, speed: 0.05, r: 2.2 },
  { s: 8, at: 0.75, speed: -0.06, r: 2.8 },
  { s: 6, at: 0.62, speed: 0.045, r: 2.0 },
];

const f1 = (n) => n.toFixed(1);

// A smooth centre line through a rope's points.
function smooth(p, n) {
  let d = `M${f1(p[0].x)},${f1(p[0].y)}`;
  for (let k = 1; k < n - 1; k++) {
    d += ` Q${f1(p[k].x)},${f1(p[k].y)} ${f1((p[k].x + p[k + 1].x) / 2)},${f1((p[k].y + p[k + 1].y) / 2)}`;
  }
  return d + ` L${f1(p[n - 1].x)},${f1(p[n - 1].y)}`;
}

// A rope as a filled shape that tapers from width w0 at its root to w1 at its
// tip, built by offsetting its points along their normals. A stroke has one
// width, but the goo is thick where it leaves the button and thins to a thread.
function taper(p, n, w0, w1) {
  const L = new Array(n);
  const R = new Array(n);
  for (let k = 0; k < n; k++) {
    const a = p[Math.max(0, k - 1)];
    const b = p[Math.min(n - 1, k + 1)];
    let tx = b.x - a.x;
    let ty = b.y - a.y;
    const m = Math.hypot(tx, ty) || 1;
    tx /= m;
    ty /= m;
    const half = (w0 + (w1 - w0) * Math.pow(k / (n - 1), 0.7)) / 2;
    L[k] = [p[k].x - ty * half, p[k].y + tx * half];
    R[k] = [p[k].x + ty * half, p[k].y - tx * half];
  }
  let d = `M${f1(L[0][0])},${f1(L[0][1])}`;
  for (let k = 1; k < n - 1; k++) {
    d += ` Q${f1(L[k][0])},${f1(L[k][1])} ${f1((L[k][0] + L[k + 1][0]) / 2)},${f1((L[k][1] + L[k + 1][1]) / 2)}`;
  }
  d += ` L${f1(L[n - 1][0])},${f1(L[n - 1][1])} L${f1(R[n - 1][0])},${f1(R[n - 1][1])}`;
  for (let k = n - 2; k >= 1; k--) {
    d += ` Q${f1(R[k][0])},${f1(R[k][1])} ${f1((R[k][0] + R[k - 1][0]) / 2)},${f1((R[k][1] + R[k - 1][1]) / 2)}`;
  }
  return d + ` L${f1(R[0][0])},${f1(R[0][1])} Z`;
}

/*
 * The web, after the reference video: strands of black goo from the button's
 * near edge to the hand.
 *
 * Each strand is a rope, a chain of points under Verlet integration, pinned to
 * the button at one end and to the hand at the other. Only the ends are driven,
 * everything between them is physics:
 *
 * - The far end is shot out on the `reach` spring, so the strands fly out and
 *   overshoot the hand, then settle. On release they whip back past the button.
 * - A rope has a length, which follows the distance to the hand with a lag.
 *   Move away quickly and the rope is briefly short, so it goes taut and thin,
 *   like goo pulled into a thread; stop, and it relaxes into a droop.
 * - The hand's own motion is passed on to the ropes, so a quick move sends
 *   ripples down them, and gravity makes the slack sag.
 *
 * They are drawn as tapered shapes, thick at the button and fine at the hand,
 * rooted in a tight cluster at the button's edge, with a blob of the same black
 * where they join it, drops creeping along them, fine threads tying neighbours
 * together, and a few loose wisps hanging off the button's lower edge. The roots
 * follow the button's own tilt. Redrawn every frame while mounted, written
 * straight to the DOM so React never re-renders for it.
 */
function Web({ box, px, py, reach, bx, by, rot }) {
  const body = useRef([]);
  const shine = useRef([]);
  const rungs = useRef([]);
  const beads = useRef([]);
  const bulbs = useRef([]);
  const wisps = useRef([]);
  const blob = useRef(null);
  const group = useRef(null);
  const knot = useRef(null);
  const hw = box.w / 2;
  const hh = box.h / 2;
  const cx = hw + PAD;
  const cy = hh + PAD;

  useEffect(() => {
    const slot = window.__webPull;
    const strands = Array.from({ length: STRANDS }, () => ({
      pts: Array.from({ length: SEG }, () => ({ x: 0, y: 0, px: 0, py: 0 })),
      rope: 12, // starts short, so a freshly fired strand is taut and thin
      ready: false,
      ax: 0, ay: 0, // where it is pinned to the button
      tx: 0, ty: 0, // where it would reach at full extension
    }));
    const hairs = HAIRS.map((h) => ({
      pts: Array.from({ length: HSEG }, () => ({ x: 0, y: 0, px: 0, py: 0 })),
      len: h.len,
      ready: false,
      ax: 0, ay: 0,
    }));
    let raf = 0;
    let prev = 0;
    let acc = 0;
    let lastDx = null;
    let lastDy = null;

    // One fixed step of every rope.
    const simulate = (ext, t) => {
      for (let i = 0; i < STRANDS; i++) {
        const s = strands[i];
        const tr = TRAITS[i];
        const p = s.pts;
        const last = p[SEG - 1];
        if (!s.ready) {
          for (const q of p) {
            q.x = q.px = s.ax;
            q.y = q.py = s.ay;
          }
          s.ready = true;
        }

        // The driven ends.
        const ex = s.ax + (s.tx - s.ax) * ext;
        const ey = s.ay + (s.ty - s.ay) * ext;
        p[0].x = p[0].px = s.ax;
        p[0].y = p[0].py = s.ay;
        last.x = last.px = ex;
        last.y = last.py = ey;

        // The rope's length lags the distance to the hand, which is what makes
        // it stretch under a quick move and sag once it stops.
        s.rope += (Math.hypot(ex - s.ax, ey - s.ay) * tr.slack - s.rope) * tr.lag;

        // Verlet integration of the free points.
        for (let k = 1; k < SEG - 1; k++) {
          const q = p[k];
          const vx = (q.x - q.px) * DAMP;
          const vy = (q.y - q.py) * DAMP;
          q.px = q.x;
          q.py = q.y;
          // A slight breeze, out of step along each rope, so it is never quite still.
          q.x += vx + Math.sin(t * 2.3 + i * 1.3 + k * 0.6) * 0.05 * ext;
          q.y += vy + GRAVITY * tr.heavy * ext;
        }

        // Hold the segment lengths. The ends are pinned, so they do not move.
        const rest = s.rope / (SEG - 1);
        for (let pass = 0; pass < PASSES; pass++) {
          for (let k = 0; k < SEG - 1; k++) {
            const a = p[k];
            const b = p[k + 1];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d = Math.hypot(dx, dy) || 0.0001;
            const diff = (d - rest) / d;
            const wa = k === 0 ? 0 : 1;
            const wb = k + 1 === SEG - 1 ? 0 : 1;
            const sum = wa + wb;
            if (!sum) continue;
            a.x += dx * diff * (wa / sum);
            a.y += dy * diff * (wa / sum);
            b.x -= dx * diff * (wb / sum);
            b.y -= dy * diff * (wb / sum);
          }
        }
      }

      // The loose wisps: pinned at the root only, so they hang and swing free.
      for (let h = 0; h < hairs.length; h++) {
        const w = hairs[h];
        const p = w.pts;
        if (!w.ready) {
          for (const q of p) {
            q.x = q.px = w.ax;
            q.y = q.py = w.ay;
          }
          w.ready = true;
        }
        p[0].x = p[0].px = w.ax;
        p[0].y = p[0].py = w.ay;
        for (let k = 1; k < HSEG; k++) {
          const q = p[k];
          const vx = (q.x - q.px) * 0.96;
          const vy = (q.y - q.py) * 0.96;
          q.px = q.x;
          q.py = q.y;
          q.x += vx + (Math.sin(t * 2.9 + h * 1.7 + k * 0.5) * 0.13 + HAIRS[h].curl * 0.07 * (k / HSEG)) * ext;
          q.y += vy + 0.26 * ext;
        }
        const rest = w.len / (HSEG - 1);
        for (let pass = 0; pass < PASSES; pass++) {
          for (let k = 0; k < HSEG - 1; k++) {
            const a = p[k];
            const b = p[k + 1];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d = Math.hypot(dx, dy) || 0.0001;
            const diff = (d - rest) / d;
            const wa = k === 0 ? 0 : 1;
            const sum = wa + 1;
            a.x += dx * diff * (wa / sum);
            a.y += dy * diff * (wa / sum);
            b.x -= dx * diff * (1 / sum);
            b.y -= dy * diff * (1 / sum);
          }
        }
      }
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = prev ? Math.min(0.05, (now - prev) / 1000) : STEP;
      prev = now;
      acc += dt;
      const t = now / 1000;

      const dx = px.get();
      const dy = py.get();
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const perpx = -uy;
      const perpy = ux;
      const rim = 1 / Math.max(Math.abs(ux) / hw, Math.abs(uy) / hh);
      const rcx = cx + bx.get();
      const rcy = cy + by.get();

      // The button tilts as it is pulled, so everything pinned to it has to
      // turn with it, or the roots drift off the edge it is meant to grow from.
      const phi = (rot.get() * Math.PI) / 180;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);
      const spread = Math.min(hh, hw) * 0.6;

      for (let i = 0; i < STRANDS; i++) {
        const u = (i / (STRANDS - 1) - 0.5) * 2; // -1..1 across the cluster
        const s = strands[i];
        // Roots are staggered a few px along the pull, so they do not sit in a line.
        const stagger = Math.sin(i * 2.3) * 4;
        const ox = ux * (rim * 0.97 + stagger) + perpx * u * spread;
        const oy = uy * (rim * 0.97 + stagger) + perpy * u * spread;
        s.ax = rcx + ox * cosP - oy * sinP;
        s.ay = rcy + ox * sinP + oy * cosP;
        // All the strands gather on the hand, a couple of px apart.
        s.tx = cx + dx + perpx * u * 2;
        s.ty = cy + dy + perpy * u * 2;
      }
      for (let h = 0; h < hairs.length; h++) {
        const ox = HAIRS[h].f * hw * 0.9;
        const oy = hh * 0.94;
        hairs[h].ax = rcx + ox * cosP - oy * sinP;
        hairs[h].ay = rcy + ox * sinP + oy * cosP;
      }

      // Pass the hand's own motion on to the ropes as a push, strongest mid-rope,
      // so a quick move sends a ripple down them instead of just dragging the end.
      if (lastDx !== null) {
        const hvx = Math.max(-60, Math.min(60, dx - lastDx));
        const hvy = Math.max(-60, Math.min(60, dy - lastDy));
        if (hvx || hvy) {
          for (const s of strands) {
            if (!s.ready) continue;
            for (let k = 1; k < SEG - 1; k++) {
              const w = Math.sin((Math.PI * k) / (SEG - 1)) * WHIP;
              s.pts[k].px -= hvx * w;
              s.pts[k].py -= hvy * w;
            }
          }
        }
      }
      lastDx = dx;
      lastDy = dy;

      // Overshoot is allowed past the hand, but not behind the button.
      const ext = Math.max(0, Math.min(1.18, reach.get()));
      let steps = 0;
      while (acc >= STEP && steps < 4) {
        acc -= STEP;
        steps++;
        simulate(ext, t);
      }
      if (steps === 4) acc = 0; // fell far behind (a hidden tab): do not catch up

      // Tell the cursor which way the strands are running where they meet the
      // hand, so the hand can hang from them.
      const mid = strands[(STRANDS - 1) / 2].pts;
      const vx = mid[SEG - 1].x - mid[SEG - 3].x;
      const vy = mid[SEG - 1].y - mid[SEG - 3].y;
      const vm = Math.hypot(vx, vy);
      if (slot && vm > 0.5) {
        slot.dir ||= { x: 0, y: 1 };
        slot.dir.x = vx / vm;
        slot.dir.y = vy / vm;
      }

      // Fade the web out as the hand arrives at the button, rather than
      // drawing strands that run backwards through it.
      const near = Math.min(1, Math.max(0, (len - rim) / 26));
      if (group.current) group.current.style.opacity = String(Math.min(1, ext * 1.6) * near);

      // --- draw ---
      const scale = Math.max(0.7, Math.min(1.1, 1.15 - len / 900));
      for (let i = 0; i < STRANDS; i++) {
        const s = strands[i];
        const tr = TRAITS[i];
        const p = s.pts;

        // Stretched past its length it thins; slack leaves it full width.
        const span = Math.hypot(p[SEG - 1].x - p[0].x, p[SEG - 1].y - p[0].y);
        const stretch = Math.max(0, span / Math.max(1, s.rope) - 1);
        const thin = Math.max(0.5, 1 / (1 + stretch * 1.5));
        const w0 = (tr.cable ? 3.8 : 1.7) * scale * thin;
        const w1 = (tr.cable ? 1.2 : 0.6) * thin;

        const b = body.current[i];
        if (b) b.setAttribute("d", taper(p, SEG, w0, w1));
        const h = shine.current[i];
        if (h) h.setAttribute("d", tr.cable ? smooth(p, SEG) : "");

        const bulb = bulbs.current[i];
        if (bulb) {
          bulb.setAttribute("cx", f1(p[0].x));
          bulb.setAttribute("cy", f1(p[0].y));
          bulb.setAttribute("r", f1((tr.cable ? 2.5 : 1.5) * scale));
        }
      }

      // The fine web: neighbouring strands tied together, each tie slanted the
      // opposite way to the last, so it makes diamonds rather than rungs.
      let n = 0;
      for (let i = 0; i < STRANDS - 1; i++) {
        for (let r = 0; r < RUNG_AT.length; r++) {
          const node = rungs.current[n++];
          if (!node) continue;
          const k = RUNG_AT[r];
          const a = strands[i].pts[k];
          const b = strands[i + 1].pts[Math.min(SEG - 2, k + ((i + r) % 2))];
          node.setAttribute("d", `M${f1(a.x)},${f1(a.y)} Q${f1((a.x + b.x) / 2)},${f1((a.y + b.y) / 2 + 2.5)} ${f1(b.x)},${f1(b.y)}`);
        }
      }

      // Drops of goo creeping along their strands, wrapping round at the ends.
      BEADS.forEach((bd, j) => {
        const node = beads.current[j];
        if (!node) return;
        const pos = (((t * bd.speed + bd.at) % 1) + 1) % 1;
        const f = (0.1 + pos * 0.8) * (SEG - 1);
        const k = Math.min(SEG - 2, Math.floor(f));
        const fr = f - k;
        const a = strands[bd.s].pts[k];
        const c = strands[bd.s].pts[k + 1];
        node.setAttribute("cx", f1(a.x + (c.x - a.x) * fr));
        node.setAttribute("cy", f1(a.y + (c.y - a.y) * fr));
      });

      // The loose wisps.
      for (let h = 0; h < hairs.length; h++) {
        const node = wisps.current[h];
        if (node) node.setAttribute("d", taper(hairs[h].pts, HSEG, 3.0, 0.6));
      }

      // The blob of black where the strands join the button, so they look grown
      // out of it rather than stuck on, turned to lie along the button's edge.
      if (blob.current) {
        const ox = ux * (rim * 0.97 - 1);
        const oy = uy * (rim * 0.97 - 1);
        const bxp = rcx + ox * cosP - oy * sinP;
        const byp = rcy + ox * sinP + oy * cosP;
        const ang = (Math.atan2(perpy, perpx) * 180) / Math.PI + rot.get();
        blob.current.setAttribute("cx", f1(bxp));
        blob.current.setAttribute("cy", f1(byp));
        blob.current.setAttribute("rx", f1(spread + 4));
        blob.current.setAttribute("ry", "4.6");
        blob.current.setAttribute("transform", `rotate(${f1(ang)} ${f1(bxp)} ${f1(byp)})`);
      }

      // The knot where the bundle meets the hand.
      if (knot.current) {
        const q = mid[SEG - 1];
        knot.current.setAttribute("cx", f1(q.x));
        knot.current.setAttribute("cy", f1(q.y));
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [px, py, reach, bx, by, rot, cx, cy, hw, hh]);

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -z-10 overflow-visible"
      style={{ left: -PAD, top: -PAD, width: box.w + PAD * 2, height: box.h + PAD * 2 }}
    >
      <g ref={group} fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0 }}>
        <g stroke="rgba(18,18,26,0.36)" strokeWidth="0.75">
          {Array.from({ length: (STRANDS - 1) * RUNG_AT.length }, (_, i) => (
            <path key={i} ref={(n) => (rungs.current[i] = n)} />
          ))}
        </g>
        <g fill={INK} stroke="none">
          {Array.from({ length: STRANDS }, (_, i) => (
            <path key={i} ref={(n) => (body.current[i] = n)} />
          ))}
        </g>
        {/* a glint along each thick cable, nudged up and left, so the goo is wet */}
        <g stroke="rgba(255,255,255,0.3)" strokeWidth="0.9" transform="translate(-0.7 -0.8)">
          {Array.from({ length: STRANDS }, (_, i) => (
            <path key={i} ref={(n) => (shine.current[i] = n)} />
          ))}
        </g>
        <g fill={INK} stroke="none">
          {HAIRS.map((_, h) => (
            <path key={h} ref={(n) => (wisps.current[h] = n)} />
          ))}
          {BEADS.map((bd, j) => (
            <circle key={j} r={bd.r} ref={(n) => (beads.current[j] = n)} />
          ))}
          <ellipse ref={blob} rx="12" ry="6.5" />
          {Array.from({ length: STRANDS }, (_, i) => (
            <circle key={i} r="2.4" ref={(n) => (bulbs.current[i] = n)} />
          ))}
          <circle ref={knot} r="2.6" />
        </g>
      </g>
    </svg>
  );
}
