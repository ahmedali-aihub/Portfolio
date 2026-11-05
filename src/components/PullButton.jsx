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

const STRANDS = 9;
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
const SLACK = 1.045; // rope length as a multiple of the straight distance: this is the sag
const PASSES = 4; // constraint passes per step: more is stiffer
const RUNG_AT = [4, 8]; // which points the cross-threads tie neighbouring strands at

// A few beads of glue strung on particular strands: [strand, point, radius].
const BEADS = [
  [1, 5, 1.9],
  [3, 8, 1.5],
  [5, 4, 2.0],
  [7, 7, 1.6],
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
 * - Gravity makes the slack sag, and moving the hand sets the whole net swinging.
 *
 * Short cross-threads, beads of glue and sticky roots on the rim make it read as
 * a net rather than as a fan of lines. Redrawn every frame while mounted,
 * written straight to the DOM so React never re-renders for it.
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
    let acc = 0;

    // One fixed step of every rope.
    const simulate = (ext, t) => {
      for (let i = 0; i < STRANDS; i++) {
        const s = strands[i];
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
        s.rope += (Math.hypot(ex - s.ax, ey - s.ay) * SLACK - s.rope) * 0.1;

        // Verlet integration of the free points.
        for (let k = 1; k < SEG - 1; k++) {
          const q = p[k];
          const vx = (q.x - q.px) * DAMP;
          const vy = (q.y - q.py) * DAMP;
          q.px = q.x;
          q.py = q.y;
          // A slight breeze, out of step along each rope, so it is never quite still.
          q.x += vx + Math.sin(t * 2.3 + i * 1.3 + k * 0.6) * 0.05 * ext;
          q.y += vy + GRAVITY * ext;
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
      const spread = Math.min(hh, hw) * 1.25;

      for (let i = 0; i < STRANDS; i++) {
        const u = (i / (STRANDS - 1) - 0.5) * 2; // -1..1 across the bundle
        const s = strands[i];
        s.ax = rimx + perpx * u * spread;
        s.ay = rimy + perpy * u * spread;
        // All the strands gather on the fingertip, a couple of px apart.
        s.tx = cx + dx + perpx * u * 2.4;
        s.ty = cy + dy + perpy * u * 2.4;
      }

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
      const baseW = Math.max(2.0, Math.min(3.6, 3.9 - len / 140));
      for (let i = 0; i < STRANDS; i++) {
        const u = (i / (STRANDS - 1) - 0.5) * 2;
        const s = strands[i];
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
        const w = Math.max(0.9, (baseW * (1 - 0.28 * Math.abs(u))) / (1 + stretch * 1.7));

        const b = body.current[i];
        const g = glowP.current[i];
        const h = shine.current[i];
        if (b) {
          b.setAttribute("d", d);
          b.setAttribute("stroke-width", w.toFixed(2));
        }
        if (g) {
          g.setAttribute("d", d);
          g.setAttribute("stroke-width", (w * 3.4).toFixed(2));
        }
        if (h) h.setAttribute("d", d);

        const root = roots.current[i];
        if (root) {
          root.setAttribute("cx", p[0].x.toFixed(1));
          root.setAttribute("cy", p[0].y.toFixed(1));
        }
      }

      // Cross-threads: tied between neighbouring ropes, with a little sag.
      let n = 0;
      for (let i = 0; i < STRANDS - 1; i++) {
        for (const k of RUNG_AT) {
          const node = rungs.current[n++];
          if (!node) continue;
          const a = strands[i].pts[k];
          const b = strands[i + 1].pts[k];
          node.setAttribute(
            "d",
            `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${((a.x + b.x) / 2).toFixed(1)},${((a.y + b.y) / 2 + 2.5).toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`,
          );
        }
      }

      // Beads of glue riding on their ropes.
      BEADS.forEach(([si, k], j) => {
        const node = beads.current[j];
        const q = strands[si].pts[k];
        if (node) {
          node.setAttribute("cx", q.x.toFixed(1));
          node.setAttribute("cy", q.y.toFixed(1));
        }
      });

      // The knot where the bundle meets the fingertip.
      if (knot.current) {
        const q = strands[(STRANDS - 1) / 2].pts[SEG - 1];
        knot.current.setAttribute("cx", q.x.toFixed(1));
        knot.current.setAttribute("cy", q.y.toFixed(1));
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
        <g stroke="rgba(190,202,235,0.42)" strokeWidth="0.95">
          {Array.from({ length: (STRANDS - 1) * RUNG_AT.length }, (_, i) => (
            <path key={i} ref={(n) => (rungs.current[i] = n)} />
          ))}
        </g>
        <g stroke="rgba(172,186,226,0.86)">
          {Array.from({ length: STRANDS }, (_, i) => (
            <path key={i} ref={(n) => (body.current[i] = n)} />
          ))}
        </g>
        {/* a thin highlight, nudged up and left of each strand, for a glossy edge */}
        <g stroke="rgba(250,252,255,0.72)" strokeWidth="0.8" transform="translate(-0.5 -0.7)">
          {Array.from({ length: STRANDS }, (_, i) => (
            <path key={i} ref={(n) => (shine.current[i] = n)} />
          ))}
        </g>
        <g fill="rgba(238,244,255,0.85)" stroke="none">
          {BEADS.map(([, , r], j) => (
            <circle key={j} r={r} ref={(n) => (beads.current[j] = n)} />
          ))}
        </g>
        {/* sticky roots where each strand is stuck to the button */}
        <g fill="rgba(196,208,240,0.78)" stroke="none">
          {Array.from({ length: STRANDS }, (_, i) => (
            <circle key={i} r={2.2 + 0.7 * (1 - Math.abs((i / (STRANDS - 1) - 0.5) * 2))} ref={(n) => (roots.current[i] = n)} />
          ))}
        </g>
        <circle ref={knot} r="3.4" fill="rgba(214,224,248,0.9)" stroke="none" />
      </g>
    </svg>
  );
}
