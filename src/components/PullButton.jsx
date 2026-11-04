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
const GAP = 22; // px the held hand is kept clear of the button's rim

export default function PullButton({ children, className = "", radius = 320, lean = 10, ...props }) {
  const wrapRef = useRef(null);
  const [box, setBox] = useState(null);
  const [web, setWeb] = useState(false);

  // Where the hand's wrist is being held, relative to the button's resting
  // centre, plus the grip strength 0..1.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const grip = useMotionValue(0);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const glow = useMotionValue(0);

  const spring = { stiffness: 170, damping: 15, mass: 0.6 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);
  const sg = useSpring(glow, { stiffness: 120, damping: 20 });
  const sgrip = useSpring(grip, { stiffness: 200, damping: 24 });
  const rotate = useTransform(sx, [-lean, lean], [-3, 3]);

  // Keep the web mounted while it is visibly fading out, not just while gripped.
  useMotionValueEvent(sgrip, "change", (v) => setWeb(v > 0.01));

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
    const slot = (window.__webPull ||= { owner: null, x: 0, y: 0, grip: 0, ux: 0, uy: 1 });
    const me = {};

    const release = () => {
      grip.set(0);
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

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);
      const reach = radius + r.width / 2;

      if (dist >= reach) {
        release();
        return;
      }
      // Claim the shared cursor slot unless a nearer button has claimed it for
      // this same pointer event. Stale claims (from an earlier move) lose.
      const stamp = e.timeStamp;
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
      const g = t * t * (3 - 2 * t); // smoothstep, so the grab bites rather than creeps

      grip.set(g);
      glow.set(Math.min(1, t * 1.5));

      const ux = dx / (dist || 1);
      const uy = dy / (dist || 1);

      // Distance from the button's centre to its edge along the pull line. The
      // hand is reeled in to GAP px beyond that rim and held there; if the
      // pointer is already inside that ring there is nothing to haul, so the
      // drawn hand stays exactly under the real pointer.
      const rim = 1 / Math.max(Math.abs(ux) / (r.width / 2), Math.abs(uy) / (r.height / 2));
      const stand = rim + GAP;
      const hauled = dist <= stand ? dist : dist - (dist - stand) * CATCH * g;

      slot.x = ux * hauled - dx;
      slot.y = uy * hauled - dy;
      slot.grip = g;
      slot.ux = ux;
      slot.uy = uy;
      // 0 once the hand is on the button, 1 once it is held clear of it: the
      // cursor only swings round to hang from the web while there is a web.
      slot.near = Math.min(1, Math.max(0, (hauled - rim) / 26));

      // The strands end where the hand actually ends up.
      px.set(ux * hauled);
      py.set(uy * hauled);

      // The button leans into the pull, far less than the cursor moves.
      const k = Math.min(1, lean / (dist || 1)) * g;
      x.set(dx * k);
      y.set(dy * k);
    };

    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", release);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", release);
      window.removeEventListener("blur", release);
      release();
    };
  }, [radius, lean, px, py, grip, x, y, glow]);

  return (
    <div ref={wrapRef} className="relative isolate inline-block">
      {box && web && <Web box={box} px={px} py={py} grip={sgrip} bx={sx} by={sy} />}
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

// A point on a quadratic Bézier, t in 0..1.
const bez = (a, m, b, t) => {
  const s = 1 - t;
  return s * s * a + 2 * s * t * m + t * t * b;
};

const RUNGS = [0.36, 0.68]; // where cross-threads tie neighbouring strands together

/*
 * The web: a net of silk from the button's near rim to the held wrist.
 *
 * Each strand leaves from its own spot on the rim and gathers into a knot at
 * the wrist. They droop under gravity, sway when the hand is moving, and get
 * thinner the further they are stretched, like glue pulled into a thread. Short
 * cross-threads tie neighbouring strands together so it reads as a net, not as
 * a fan of parallel lines. Redrawn every frame while mounted, written straight
 * to the DOM so React never re-renders for it.
 */
function Web({ box, px, py, grip, bx, by }) {
  const body = useRef([]);
  const shine = useRef([]);
  const rungs = useRef([]);
  const group = useRef(null);
  const knot = useRef(null);
  const hw = box.w / 2;
  const hh = box.h / 2;
  const cx = hw + PAD;
  const cy = hh + PAD;

  useEffect(() => {
    const phase = Array.from({ length: STRANDS }, (_, i) => i * 1.9 + 0.6);
    const pts = Array.from({ length: STRANDS }, () => ({ ax: 0, ay: 0, mx: 0, my: 0, tx: 0, ty: 0 }));
    let lastX = null;
    let lastY = null;
    let energy = 0;
    let raf = 0;

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const t = now / 1000;
      const g = grip.get();
      const dx = px.get();
      const dy = py.get();
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const perpx = -uy;
      const perpy = ux;

      // How agitated the web is: the held point's recent speed, decaying, so a
      // moving hand whips the strands and a still one only sways.
      if (lastX !== null) energy = Math.min(1, energy * 0.92 + Math.hypot(dx - lastX, dy - lastY) * 0.05);
      lastX = dx;
      lastY = dy;
      const slack = 0.2 + 0.8 * energy;

      // Fade the web out as the hand arrives at the button, rather than
      // drawing strands that run backwards through it.
      const rim = 1 / Math.max(Math.abs(ux) / hw, Math.abs(uy) / hh);
      const near = Math.min(1, Math.max(0, (len - rim) / 26));
      if (group.current) group.current.style.opacity = String(Math.min(1, g * 1.4) * near);

      const rcx = cx + bx.get();
      const rcy = cy + by.get();
      const tipx = cx + dx;
      const tipy = cy + dy;
      const rimx = rcx + ux * rim * 0.97;
      const rimy = rcy + uy * rim * 0.97;
      const span = Math.max(1, Math.hypot(tipx - rimx, tipy - rimy));
      const spread = Math.min(hh, hw) * 1.25;
      // Thinner the further it is stretched, but never down to a hairline:
      // this is meant to read as thick silk, not as a drawn line.
      const width = Math.max(1.8, Math.min(3.8, 4.4 - span / 110));

      for (let i = 0; i < STRANDS; i++) {
        const u = (i / (STRANDS - 1) - 0.5) * 2; // -1..1 across the bundle
        const p = pts[i];
        p.ax = rimx + perpx * u * spread;
        p.ay = rimy + perpy * u * spread;
        p.tx = tipx + perpx * u * 2.4;
        p.ty = tipy + perpy * u * 2.4;

        const sway = Math.sin(t * 4.2 + phase[i]) * 7 * slack * (0.45 + Math.abs(u) * 0.55);
        // Each strand bows a different way, so they cross over one another on
        // the way to the wrist like twisted silk rather than running parallel.
        const bow = Math.sin(i * 1.7 + 0.5) * span * 0.075 + u * span * 0.03 + sway;
        const droop = span * 0.06 * (1 - g * 0.35); // gravity
        p.mx = (p.ax + p.tx) / 2 + perpx * bow;
        p.my = (p.ay + p.ty) / 2 + perpy * bow + droop;

        const d = `M${p.ax.toFixed(1)},${p.ay.toFixed(1)} Q${p.mx.toFixed(1)},${p.my.toFixed(1)} ${p.tx.toFixed(1)},${p.ty.toFixed(1)}`;
        const w = width * (1 - 0.28 * Math.abs(u));
        const b = body.current[i];
        const s = shine.current[i];
        if (b) {
          b.setAttribute("d", d);
          b.setAttribute("stroke-width", w.toFixed(2));
        }
        if (s) s.setAttribute("d", d);
      }

      // Cross-threads between neighbours, slung a little behind the bundle.
      let n = 0;
      for (let i = 0; i < STRANDS - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        for (const tt of RUNGS) {
          const node = rungs.current[n++];
          if (!node) continue;
          const x1 = bez(a.ax, a.mx, a.tx, tt);
          const y1 = bez(a.ay, a.my, a.ty, tt);
          const x2 = bez(b.ax, b.mx, b.tx, tt);
          const y2 = bez(b.ay, b.my, b.ty, tt);
          const sag = 3 + span * 0.012;
          node.setAttribute("d", `M${x1.toFixed(1)},${y1.toFixed(1)} Q${((x1 + x2) / 2 + ux * sag).toFixed(1)},${((y1 + y2) / 2 + uy * sag + 1.5).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`);
        }
      }

      if (knot.current) {
        knot.current.setAttribute("cx", tipx.toFixed(1));
        knot.current.setAttribute("cy", tipy.toFixed(1));
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [px, py, grip, bx, by, cx, cy, hw, hh]);

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -z-10 overflow-visible"
      style={{ left: -PAD, top: -PAD, width: box.w + PAD * 2, height: box.h + PAD * 2 }}
    >
      <g ref={group} fill="none" strokeLinecap="round" style={{ opacity: 0 }}>
        <g stroke="rgba(190,202,235,0.42)" strokeWidth="0.95">
          {Array.from({ length: (STRANDS - 1) * RUNGS.length }, (_, i) => (
            <path key={i} ref={(n) => (rungs.current[i] = n)} />
          ))}
        </g>
        <g stroke="rgba(172,186,226,0.82)">
          {Array.from({ length: STRANDS }, (_, i) => (
            <path key={i} ref={(n) => (body.current[i] = n)} />
          ))}
        </g>
        <g stroke="rgba(248,250,255,0.7)" strokeWidth="0.8">
          {Array.from({ length: STRANDS }, (_, i) => (
            <path key={i} ref={(n) => (shine.current[i] = n)} />
          ))}
        </g>
        <circle ref={knot} r="3.4" fill="rgba(206,216,244,0.85)" stroke="none" />
      </g>
    </svg>
  );
}
