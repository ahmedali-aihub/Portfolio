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

const STRANDS = 13; // odd, so the middle strand lands exactly on the fingertip
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
export default function PullButton({ children, className = "", radius = 760, lean = 10, ...props }) {
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
  const rotate = useTransform(sx, [-lean, lean], [-3, 3]);

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
    const section = el.closest("section");
    const slot = (window.__webPull ||= { owner: null, x: 0, y: 0, grip: 0 });
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
      // Only inside the section the buttons belong to: the web must not shoot
      // across the page while you are reading something else.
      if (section) {
        const s = section.getBoundingClientRect();
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
      {box && web && <Web box={box} px={px} py={py} reach={sextent} bx={sx} by={sy} />}
      <motion.span
        aria-hidden="true"
        style={{ x: sx, y: sy, opacity: sg }}
        className="pointer-events-none absolute -inset-3 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(200,210,255,0.35),transparent)] blur-xl"
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
const STEP = 1 / 60; // the simulation advances in fixed 60Hz steps, whatever the display rate
const GRAVITY = 0.34; // px per step², applied while the web is out
const DAMP = 0.975; // velocity kept per step: low enough to settle, high enough to whip
const PASSES = 4; // constraint passes per step: more is stiffer
const RUNG_AT = [3, 6, 9]; // where the lattice ties neighbouring strands together
const WHIP = 0.1; // how much of the hand's own motion is passed on to the ropes

// A deterministic 0..1 value from two seeds, so each strand keeps its own
// character without the web changing from one grab to the next.
const seed = (i, s) => {
  const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

// What makes each strand its own: every third is a thick cable and the rest are
// fine threads, and each has its own slack and weight, so they hang at different
// depths and cross over instead of lying in parallel like a ribbon.
const TRAITS = Array.from({ length: STRANDS }, (_, i) => ({
  cable: i % 3 === 1,
  slack: 1.03 + 0.085 * seed(i, 1),
  heavy: 0.8 + 0.55 * seed(i, 2),
  lag: 0.07 + 0.08 * seed(i, 3),
}));

// Beads of glue that creep along particular strands: strand, start, speed, radius.
const BEADS = [
  { s: 1, at: 0.1, speed: 0.07, r: 2.1 },
  { s: 3, at: 0.55, speed: -0.05, r: 1.5 },
  { s: 4, at: 0.3, speed: 0.06, r: 2.3 },
  { s: 7, at: 0.8, speed: -0.07, r: 1.7 },
  { s: 9, at: 0.4, speed: 0.05, r: 2.0 },
  { s: 10, at: 0.7, speed: -0.06, r: 1.4 },
];

/*
 * The web: a net of elastic silk from the button's near rim to the fingertip.
 *
 * Each strand is a rope, a chain of points under Verlet integration, pinned to
 * the rim at one end and to the fingertip at the other. Only the ends are
 * driven, everything between them is physics, so the rest follows from that:
 *
 * - The far end is shot out on the `reach` spring, so the strands fly out and
 *   overshoot the hand, then settle. On release they whip back past the button.
 * - A rope has a length, which follows the distance to the hand with a lag.
 *   Move away quickly and the rope is briefly short, so it goes taut and thin,
 *   like glue pulled into a thread; stop, and it relaxes into a droop.
 * - The hand's own motion is passed on to the ropes, so a quick move sends
 *   ripples down them, and gravity makes the slack sag.
 *
 * Strands differ in weight, slack and sag, so they drape at different depths.
 * A lattice of cross-threads, beads of glue creeping along them, sticky roots on
 * the rim and a pulse where it lands make it read as a net, not a ribbon.
 * Redrawn every frame while mounted, written straight to the DOM so React never
 * re-renders for it.
 */
function Web({ box, px, py, reach, bx, by }) {
  const glowP = useRef([]);
  const body = useRef([]);
  const shine = useRef([]);
  const rungs = useRef([]);
  const beads = useRef([]);
  const roots = useRef([]);
  const group = useRef(null);
  const knot = useRef(null);
  const halo = useRef(null);
  const ring = useRef(null);
  const hw = box.w / 2;
  const hh = box.h / 2;
  const cx = hw + PAD;
  const cy = hh + PAD;

  useEffect(() => {
    const strands = Array.from({ length: STRANDS }, () => ({
      pts: Array.from({ length: SEG }, () => ({ x: 0, y: 0, px: 0, py: 0 })),
      rope: 12, // starts short, so a freshly fired strand is taut and thin
      ready: false,
      ax: 0, ay: 0, // where it is pinned to the rim
      tx: 0, ty: 0, // where it would reach at full extension
    }));
    let raf = 0;
    let prev = 0;
    let born = 0;
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
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (!born) born = now;
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
      const rimx = cx + bx.get() + ux * rim * 0.97;
      const rimy = cy + by.get() + uy * rim * 0.97;
      const spread = Math.min(hh, hw) * 1.5;

      for (let i = 0; i < STRANDS; i++) {
        const u = (i / (STRANDS - 1) - 0.5) * 2; // -1..1 across the bundle
        const s = strands[i];
        // Roots are staggered a few px along the pull, so they do not sit in a line.
        const stagger = Math.sin(i * 2.3) * 5;
        s.ax = rimx + perpx * u * spread + ux * stagger;
        s.ay = rimy + perpy * u * spread + uy * stagger;
        // All the strands gather on the fingertip, a few px apart.
        s.tx = cx + dx + perpx * u * 3.2;
        s.ty = cy + dy + perpy * u * 3.2;
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

      // Fade the web out as the hand arrives at the button, rather than
      // drawing strands that run backwards through it.
      const near = Math.min(1, Math.max(0, (len - rim) / 26));
      if (group.current) group.current.style.opacity = String(Math.min(1, ext * 1.6) * near);

      // --- draw ---
      const baseW = Math.max(2.2, Math.min(3.8, 4.1 - len / 140));
      for (let i = 0; i < STRANDS; i++) {
        const u = (i / (STRANDS - 1) - 0.5) * 2;
        const s = strands[i];
        const tr = TRAITS[i];
        const p = s.pts;
        let d = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
        for (let k = 1; k < SEG - 1; k++) {
          const mx = (p[k].x + p[k + 1].x) / 2;
          const my = (p[k].y + p[k + 1].y) / 2;
          d += ` Q${p[k].x.toFixed(1)},${p[k].y.toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`;
        }
        d += ` L${p[SEG - 1].x.toFixed(1)},${p[SEG - 1].y.toFixed(1)}`;

        // Stretched past its length it thins; slack leaves it full width.
        const span = Math.hypot(p[SEG - 1].x - p[0].x, p[SEG - 1].y - p[0].y);
        const stretch = Math.max(0, span / Math.max(1, s.rope) - 1);
        const full = tr.cable ? baseW * (1 - 0.2 * Math.abs(u)) : Math.max(1.0, baseW * 0.4);
        const w = Math.max(0.8, full / (1 + stretch * 1.7));

        const b = body.current[i];
        const g = glowP.current[i];
        const h = shine.current[i];
        if (b) {
          b.setAttribute("d", d);
          b.setAttribute("stroke-width", w.toFixed(2));
        }
        if (g) {
          g.setAttribute("d", d);
          g.setAttribute("stroke-width", (w * (tr.cable ? 3.4 : 2.2)).toFixed(2));
        }
        if (h) h.setAttribute("d", d);

        const root = roots.current[i];
        if (root) {
          // The roots flare as the web lands, then settle.
          const flare = 1 + 0.9 * Math.max(0, 1 - (now - born) / 350);
          root.setAttribute("cx", p[0].x.toFixed(1));
          root.setAttribute("cy", p[0].y.toFixed(1));
          root.setAttribute("r", ((tr.cable ? 2.8 : 1.9) * flare).toFixed(2));
        }
      }

      // The lattice: neighbouring strands tied together, each tie slanted the
      // opposite way to the last, so it makes diamonds rather than rungs.
      let n = 0;
      for (let i = 0; i < STRANDS - 1; i++) {
        for (let r = 0; r < RUNG_AT.length; r++) {
          const node = rungs.current[n++];
          if (!node) continue;
          const k = RUNG_AT[r];
          const a = strands[i].pts[k];
          const b = strands[i + 1].pts[Math.min(SEG - 2, k + ((i + r) % 2))];
          node.setAttribute(
            "d",
            `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${((a.x + b.x) / 2).toFixed(1)},${((a.y + b.y) / 2 + 2.5).toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`,
          );
        }
      }

      // Beads of glue creeping along their strands, wrapping round at the ends.
      BEADS.forEach((bd, j) => {
        const node = beads.current[j];
        if (!node) return;
        const pos = (((t * bd.speed + bd.at) % 1) + 1) % 1;
        const f = (0.1 + pos * 0.8) * (SEG - 1);
        const k = Math.min(SEG - 2, Math.floor(f));
        const fr = f - k;
        const a = strands[bd.s].pts[k];
        const c = strands[bd.s].pts[k + 1];
        node.setAttribute("cx", (a.x + (c.x - a.x) * fr).toFixed(1));
        node.setAttribute("cy", (a.y + (c.y - a.y) * fr).toFixed(1));
      });

      // Where the bundle lands on the fingertip: a knot, a soft halo round it,
      // and a ring that spreads out once as the web arrives.
      const q = strands[(STRANDS - 1) / 2].pts[SEG - 1];
      const e = Math.min(1, (now - born) / 520);
      if (knot.current) {
        knot.current.setAttribute("cx", q.x.toFixed(1));
        knot.current.setAttribute("cy", q.y.toFixed(1));
      }
      if (halo.current) {
        halo.current.setAttribute("cx", q.x.toFixed(1));
        halo.current.setAttribute("cy", q.y.toFixed(1));
      }
      if (ring.current) {
        ring.current.setAttribute("cx", q.x.toFixed(1));
        ring.current.setAttribute("cy", q.y.toFixed(1));
        ring.current.setAttribute("r", (5 + 34 * e).toFixed(1));
        ring.current.setAttribute("stroke-opacity", (0.55 * (1 - e)).toFixed(3));
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [px, py, reach, bx, by, cx, cy, hw, hh]);

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -z-10 overflow-visible"
      style={{ left: -PAD, top: -PAD, width: box.w + PAD * 2, height: box.h + PAD * 2 }}
    >
      <g ref={group} fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0 }}>
        {/* a soft glow under everything */}
        <g stroke="rgba(150,172,255,0.11)">
          {Array.from({ length: STRANDS }, (_, i) => (
            <path key={i} ref={(n) => (glowP.current[i] = n)} />
          ))}
        </g>
        <g stroke="rgba(190,202,235,0.4)" strokeWidth="0.85">
          {Array.from({ length: (STRANDS - 1) * RUNG_AT.length }, (_, i) => (
            <path key={i} ref={(n) => (rungs.current[i] = n)} />
          ))}
        </g>
        <g stroke="rgba(172,186,226,0.88)">
          {Array.from({ length: STRANDS }, (_, i) => (
            <path key={i} ref={(n) => (body.current[i] = n)} />
          ))}
        </g>
        {/* a thin highlight, nudged up and left of each strand, for a glossy edge */}
        <g stroke="rgba(250,252,255,0.72)" strokeWidth="0.75" transform="translate(-0.5 -0.7)">
          {Array.from({ length: STRANDS }, (_, i) => (
            <path key={i} ref={(n) => (shine.current[i] = n)} />
          ))}
        </g>
        <g fill="rgba(238,244,255,0.88)" stroke="none">
          {BEADS.map((bd, j) => (
            <circle key={j} r={bd.r} ref={(n) => (beads.current[j] = n)} />
          ))}
        </g>
        {/* sticky roots where each strand is stuck to the button */}
        <g fill="rgba(196,208,240,0.8)" stroke="none">
          {Array.from({ length: STRANDS }, (_, i) => (
            <circle key={i} r="2.2" ref={(n) => (roots.current[i] = n)} />
          ))}
        </g>
        <circle ref={halo} r="9" fill="rgba(170,190,255,0.14)" stroke="none" />
        <circle ref={knot} r="3.6" fill="rgba(218,228,250,0.92)" stroke="none" />
        <circle ref={ring} r="5" fill="none" stroke="rgba(224,232,255,1)" strokeWidth="1.2" strokeOpacity="0" />
      </g>
    </svg>
  );
}
