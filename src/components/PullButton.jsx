import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/*
 * A link-button that shoots a web at your cursor and reels it in.
 *
 * Inside `radius` px the button fires a bundle of strands from its near edge
 * to the pointer, then drags the pointer toward itself: the rendered cursor is
 * pulled off the real mouse position by a growing offset, so your hand feels
 * the tug even though the OS pointer never moves. The button itself only
 * leans a little toward you. Touch and reduced-motion users get a plain link.
 *
 * The cursor offset is published on `window.__webPull` (a single shared slot,
 * claimed by whichever button is closest) and consumed by CustomCursor.
 */

const STRANDS = 11;
const PAD = 520; // px of SVG bleed, so a web fired across the viewport is not clipped
const CATCH = 0.42; // fraction of the gap the cursor gets dragged across at full grip
const STANDOFF = 46; // px the hauled cursor is kept clear of the button's centre

export default function PullButton({ children, className = "", radius = 320, lean = 10, ...props }) {
  const wrapRef = useRef(null);
  const [box, setBox] = useState(null);
  const [web, setWeb] = useState(false);
  const enabled = useRef(false);

  // Where the hand is being held, relative to the button's resting centre,
  // plus the grip strength 0..1.
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
  const sgrip = useSpring(grip, { stiffness: 220, damping: 26 });
  const rotate = useTransform(sx, [-lean, lean], [-3, 3]);

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
    enabled.current = true;
    const el = wrapRef.current;
    const slot = (window.__webPull ||= { owner: null, x: 0, y: 0, grip: 0 });
    const me = {};

    const release = () => {
      grip.set(0);
      x.set(0);
      y.set(0);
      glow.set(0);
      setWeb(false);
      if (slot.owner === me) {
        slot.owner = null;
        slot.x = 0;
        slot.y = 0;
        slot.grip = 0;
      }
    };

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
      if (slot.owner && slot.owner !== me && slot.stamp === stamp && slot.dist <= dist) {
        release();
        return;
      }
      slot.owner = me;
      slot.dist = dist;
      slot.stamp = stamp;

      const t = 1 - dist / reach; // 0 at the edge of the field, 1 at the centre
      const g = t * t * (3 - 2 * t); // smoothstep, so the grab bites rather than creeps

      grip.set(g);
      glow.set(Math.min(1, t * 1.5));
      setWeb(true);

      // Haul the drawn cursor toward the button along the web line, but never
      // past the stand-off ring: the hand should be reeled up to the button,
      // not dragged on top of the label.
      const hauled = Math.max(STANDOFF, dist - (dist - STANDOFF) * CATCH * g);
      const ux = dx / (dist || 1);
      const uy = dy / (dist || 1);
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

/*
 * The web: a bundle of strands fired from the button's near edge to the point
 * where the cursor is being held. Each strand leaves from a slightly different
 * spot on the rim and bows out by a different amount, so the bundle reads as
 * rope rather than a single line, and the whole thing fades in with the grip.
 */
function Web({ box, px, py, grip, bx, by }) {
  const paths = useRef([]);
  const group = useRef(null);
  const cx = box.w / 2 + PAD;
  const cy = box.h / 2 + PAD;
  const hw = box.w / 2;
  const hh = box.h / 2;

  useEffect(() => {
    const render = () => {
      const g = grip.get();
      const dx = px.get();
      const dy = py.get();
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;

      if (group.current) group.current.style.opacity = String(Math.min(0.9, g * 1.25));

      // px/py are already the held position of the hand.
      const tipx = cx + dx;
      const tipy = cy + dy;
      // The rim moves with the button's lean.
      const rimcx = cx + bx.get();
      const rimcy = cy + by.get();

      for (let i = 0; i < STRANDS; i++) {
        const node = paths.current[i];
        if (!node) continue;
        const u = STRANDS === 1 ? 0 : (i / (STRANDS - 1) - 0.5) * 2; // -1..1

        // Launch point: on the rim facing the hand, spread across that edge.
        // Project the unit direction onto the button's box to find the rim.
        const scale = 1 / Math.max(Math.abs(ux) / hw, Math.abs(uy) / hh);
        const perpx = -uy;
        const perpy = ux;
        const spread = u * Math.min(hw, hh) * 0.9;
        const ax = rimcx + ux * scale * 0.92 + perpx * spread;
        const ay = rimcy + uy * scale * 0.92 + perpy * spread;

        // Converge on the cursor with a small bundle offset, so the strands
        // meet in a fist rather than a point.
        const tx = tipx + perpx * u * 5;
        const ty = tipy + perpy * u * 5;

        // Bow: strands sag away from the line, more for the outer ones.
        const span = Math.hypot(tx - ax, ty - ay);
        const bow = u * span * 0.07 * (1 - g * 0.55);
        const mx = (ax + tx) / 2 + perpx * bow;
        const my = (ay + ty) / 2 + perpy * bow;

        node.setAttribute("d", `M${ax.toFixed(1)},${ay.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)}`);
        node.setAttribute("stroke-width", (1.5 - 0.6 * Math.abs(u)).toFixed(2));
      }
    };

    render();
    const stop = [px.on("change", render), py.on("change", render), grip.on("change", render), bx.on("change", render), by.on("change", render)];
    return () => stop.forEach((fn) => fn());
  }, [px, py, grip, bx, by, cx, cy, hw, hh]);

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -z-10 overflow-visible"
      style={{ left: -PAD, top: -PAD, width: box.w + PAD * 2, height: box.h + PAD * 2 }}
    >
      <g ref={group} fill="none" stroke="rgba(214,222,255,0.6)" strokeLinecap="round" style={{ opacity: 0 }}>
        {Array.from({ length: STRANDS }, (_, i) => (
          <path key={i} ref={(n) => (paths.current[i] = n)} />
        ))}
      </g>
    </svg>
  );
}
