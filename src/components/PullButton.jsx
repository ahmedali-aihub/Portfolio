import { useEffect, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";

/*
 * A link-button that is pulled toward the cursor before you even touch it.
 *
 * Inside `radius` px of the button the pointer acts like a magnet: the button
 * drifts toward it on springs, tilts, swells and lights up, and the label
 * trails slightly behind for depth. Leave the field and it snaps back.
 * Touch devices and reduced-motion users get a plain button.
 */
export default function PullButton({ children, className = "", radius = 200, maxPull = 40, ...props }) {
  const wrapRef = useRef(null);
  const reduced = useReducedMotion();

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

  return (
    <div ref={wrapRef} className="relative isolate inline-block">
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
