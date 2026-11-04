import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useSpring, useTransform } from "framer-motion";

/*
 * A link-button that is pulled toward the cursor before you even touch it,
 * tethered to its resting place by elastic web strands.
 *
 * Inside `radius` px of the button the pointer acts like a magnet: the button
 * drifts toward it on springs, tilts, swells and lights up, and the label
 * trails slightly behind for depth. The strands anchor to the side it is
 * pulled away from, stretching and sagging as it moves, invisible at rest.
 * Touch devices and reduced-motion users get a plain button.
 */

const STRANDS = 9;
const ANCHOR_GAP = 34; // px the strand roots sit beyond the button's resting edge
const PAD = 90; // px of SVG bleed around the button, so stretched strands aren't clipped

// Anchor points spread across the trailing edge of the button, in local
// coordinates where (0,0) is the button's resting centre.
function anchors(w, h) {
  const out = [];
  for (let i = 0; i < STRANDS; i++) {
    const t = STRANDS === 1 ? 0.5 : i / (STRANDS - 1);
    out.push({ u: (t - 0.5) * 2, hw: w / 2, hh: h / 2 });
  }
  return out;
}

export default function PullButton({ children, className = "", radius = 200, maxPull = 30, ...props }) {
  const wrapRef = useRef(null);
  const reduced = useReducedMotion();
  const [box, setBox] = useState(null);
  const [web, setWeb] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const glow = useMotionValue(0);

  const spring = { stiffness: 150, damping: 13, mass: 0.6 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);
  const ss = useSpring(scale, { stiffness: 220, damping: 16 });
  const sg = useSpring(glow, { stiffness: 120, damping: 20 });

  const rotate = useTransform(sx, [-maxPull, maxPull], [-4, 4]);
  const labelX = useTransform(sx, (v) => v * 0.28);
  const labelY = useTransform(sy, (v) => v * 0.28);

  // Measure once the button is laid out, and again when it resizes.
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
    if (reduced || !window.matchMedia("(pointer: fine)").matches) return undefined;
    const el = wrapRef.current;

    const rest = () => {
      x.set(0);
      y.set(0);
      scale.set(1);
      glow.set(0);
    };

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);
      const reach = radius + r.width / 2;

      if (dist >= reach) {
        rest();
        return;
      }
      const t = 1 - dist / reach; // 0 at the edge of the field, 1 on the button's centre
      const k = 0.5 * t;
      const px = dx * k;
      const py = dy * k;
      const len = Math.hypot(px, py) || 1;
      const cap = Math.min(1, maxPull / len);
      x.set(px * cap);
      y.set(py * cap);
      scale.set(1 + 0.09 * t);
      glow.set(Math.min(1, t * 1.4));
    };

    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", rest);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", rest);
    };
  }, [reduced, radius, maxPull, x, y, scale, glow]);

  // Mount the strand layer only while the button is actually displaced, so a
  // page of resting buttons carries no extra SVG.
  useMotionValueEvent(sx, "change", () => setWeb(Math.hypot(sx.get(), sy.get()) > 0.4));
  useMotionValueEvent(sy, "change", () => setWeb(Math.hypot(sx.get(), sy.get()) > 0.4));

  return (
    <div ref={wrapRef} className="relative isolate inline-block">
      {box && web && !reduced && (
        <Web box={box} sx={sx} sy={sy} maxPull={maxPull} />
      )}
      <motion.span
        aria-hidden="true"
        style={{ x: sx, y: sy, opacity: sg }}
        className="pointer-events-none absolute -inset-3 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(200,210,255,0.35),transparent)] blur-xl"
      />
      <motion.a
        style={{ x: sx, y: sy, scale: ss, rotate }}
        whileTap={{ scale: 0.96 }}
        data-cursor="hover"
        className={`relative inline-flex items-center justify-center will-change-transform ${className}`}
        {...props}
      >
        <motion.span style={{ x: labelX, y: labelY }} className="inline-flex items-center gap-2.5">
          {children}
        </motion.span>
      </motion.a>
    </div>
  );
}

/*
 * The strands. Each is a quadratic curve from a fixed anchor in the page to a
 * point on the button's trailing edge; the control point sags behind the
 * button's travel, so the web whips as it springs back.
 */
function Web({ box, sx, sy, maxPull, stroke = "rgba(210,218,255,0.55)" }) {
  const pathRefs = useRef([]);
  const groupRef = useRef(null);
  const pts = anchors(box.w, box.h);
  const cx = box.w / 2 + PAD;
  const cy = box.h / 2 + PAD;

  useEffect(() => {
    const render = () => {
      const dx = sx.get();
      const dy = sy.get();
      const len = Math.hypot(dx, dy);
      const t = Math.min(1, len / maxPull);
      if (groupRef.current) groupRef.current.style.opacity = String(Math.min(0.85, t * 1.5));

      // Unit vector of travel; strands anchor on the opposite side.
      const ux = len > 0.01 ? dx / len : 0;
      const uy = len > 0.01 ? dy / len : 0;

      pts.forEach((p, i) => {
        const node = pathRefs.current[i];
        if (!node) return;
        // Spread the attachment across the button's trailing edge.
        // Fan across the trailing edge: narrow on the short side, wide on the long.
        const spread = p.u * (Math.abs(ux) > Math.abs(uy) ? p.hh * 1.5 : p.hw * 0.95);
        const px = -uy * spread;
        const py = ux * spread;

        // Edge of the button along the travel axis, plus a fixed stand-off:
        // the anchors sit in the page, so the gap grows as the button leaves.
        const edge = Math.abs(ux) > Math.abs(uy) ? p.hw : p.hh;
        const reach = edge + ANCHOR_GAP;
        // Anchor: fixed in the page, behind the direction of travel.
        const ax = cx - ux * reach + px * 1.6;
        const ay = cy - uy * reach + py * 1.6;
        // Tip: rides with the button, gripping its trailing edge.
        const tx = cx + dx - ux * edge * 0.92 + px * 0.45;
        const ty = cy + dy - uy * edge * 0.92 + py * 0.45;
        // Sag: the midpoint lags behind the travel and fans outward.
        const span = Math.hypot(tx - ax, ty - ay);
        const mx = (ax + tx) / 2 - ux * span * 0.1 - uy * p.u * span * 0.22;
        const my = (ay + ty) / 2 - uy * span * 0.1 + ux * p.u * span * 0.22;

        node.setAttribute("d", `M${ax.toFixed(1)},${ay.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)}`);
        node.setAttribute("stroke-width", (1.7 - 0.75 * t).toFixed(2));
      });
    };

    render();
    const stop = [sx.on("change", render), sy.on("change", render)];
    return () => stop.forEach((fn) => fn());
  }, [sx, sy, maxPull, pts, cx, cy]);

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -z-10"
      style={{ left: -PAD, top: -PAD, width: box.w + PAD * 2, height: box.h + PAD * 2 }}
    >
      <g ref={groupRef} fill="none" stroke={stroke} strokeLinecap="round" style={{ opacity: 0 }}>
        {pts.map((_, i) => (
          <path key={i} ref={(n) => (pathRefs.current[i] = n)} />
        ))}
      </g>
    </svg>
  );
}
