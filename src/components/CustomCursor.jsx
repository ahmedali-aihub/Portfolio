import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/*
 * A robotic-hand cursor.
 *
 * It follows the mouse, but PullButton can grab it: that component writes an
 * offset into `window.__webPull`, and the hand is drawn at mouse + offset, so
 * a nearby button visibly hauls it in. The hand dangles from the web like
 * something on a rope: it stays hanging fingers-down and only swings a little
 * toward the side the web is pulling from. While gripped the fingers hook.
 *
 * The pointer's hotspot is the top of the wrist, which is also where the web
 * ties on, and the hand swings about that point.
 */

export default function CustomCursor() {
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(false);
  const [grip, setGrip] = useState(0);

  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const sx = useSpring(x, { stiffness: 900, damping: 42, mass: 0.35 });
  const sy = useSpring(y, { stiffness: 900, damping: 42, mass: 0.35 });
  const tilt = useMotionValue(0);
  // Underdamped on purpose: a hand on a rope overshoots and settles.
  const stilt = useSpring(tilt, { stiffness: 140, damping: 11 });

  const mouse = useRef({ x: -200, y: -200 });

  useEffect(() => {
    const move = (e) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      setVisible(true);
    };
    const over = (e) => {
      setHovering(Boolean(e.target.closest("[data-cursor='hover'], a, button")));
    };

    let raf = 0;
    const tick = () => {
      const slot = window.__webPull;
      const held = Boolean(slot?.owner);
      const g = held ? slot.grip : 0;
      x.set(mouse.current.x + (held ? slot.x : 0));
      y.set(mouse.current.y + (held ? slot.y : 0));

      // Hang the hand like a pendulum. Gravity pulls it straight down, the web
      // pulls it away from the button along (ux, uy), and it settles between
      // the two, so its fingers always point down-ish and never sideways or up.
      // Turning "down" onto direction (dx, dy) is atan2(-dx, dy); the swing is
      // capped, and eased in with the grip so a weak pull only nudges it.
      let deg = 0;
      if (held && g > 0.02) {
        const dx = slot.ux * 0.8;
        const dy = slot.uy * 0.8 + 1;
        const theta = (Math.atan2(-dx, dy) * 180) / Math.PI;
        deg = Math.max(-55, Math.min(55, theta)) * Math.min(1, g * 2) * (slot.near ?? 1);
      }
      tilt.set(deg);
      setGrip((prev) => (Math.abs(prev - g) > 0.02 ? g : prev));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
    };
  }, [x, y, tilt]);

  const active = grip > 0.05;

  return (
    <motion.div
      className="cursor-dot"
      // Swing and scale about the cursor point (the wrist), not the box centre.
      style={{ x: sx, y: sy, rotate: stilt, originX: 0, originY: 0 }}
      animate={{ opacity: visible ? 1 : 0, scale: active ? 1 : hovering ? 0.92 : 0.82 }}
      transition={{ duration: 0.25 }}
    >
      <RoboHand grip={grip} hot={hovering || active} />
    </motion.div>
  );
}

/*
 * Drawn after the hand in the reel this cursor is modelled on: a pale,
 * glove-like hand in dark ink. Tall finger bars sit shoulder to shoulder with
 * dark dividers between them, each ends in a short rounded tip past a joint
 * line, a long thumb angles out to one side, and a strapped cuff sits at the
 * wrist where the web ties on.
 *
 * Light fill with dark linework, not the other way round: the pale mass is
 * what keeps the hand readable at cursor size against the dark page, and the
 * dividers are what keep the fingers apart. Earlier dark-fill versions fused
 * into a lump or into a handful of bubbles.
 *
 * The box is 44 x 52 with the top of the wrist at (22, 1).
 */

const FILL = "#e6eaf4";
const FILL_HOT = "#f7f9ff";
const LINE = "#0d1018";
const KNUCKLE_Y = 23; // fingers root here, under the palm, which covers the roots

// Segment lengths for each finger, root to tip. `x` is the finger's centre,
// `side` is the way it hooks (toward the middle), and `lag` staggers the hook so
// a closing hand ripples rather than moving as one block. Four 6.4-wide bars
// across the 26-wide palm leave no gaps, only the dividers.
const FINGERS = [
  { x: 12.2, segs: [12.2, 8.6], side: -1, lag: 0.85 },
  { x: 18.6, segs: [13.4, 9.4], side: -1, lag: 0.95 },
  { x: 25.0, segs: [12.8, 9.0], side: 1, lag: 1.0 },
  { x: 31.4, segs: [10.6, 7.6], side: 1, lag: 0.9 },
];

// A finger is a chain of bars, each hinged at the end of the one before. Nested
// groups give the joints for free: a child inherits its parent's rotation, so
// turning one joint swings everything beyond it. The ends are only slightly
// rounded, so each segment reads as a bar, like the reference, not a pill.
function Chain({ segs, angles, w, radius = 2.4, i = 0 }) {
  if (i >= segs.length) return null;
  return (
    <g transform={`${i ? `translate(0 ${segs[i - 1]}) ` : ""}rotate(${angles[i].toFixed(1)})`}>
      <rect x={-w / 2} y={0} width={w} height={segs[i]} rx={Math.min(radius, w / 2)} />
      <Chain segs={segs} angles={angles} w={w * 0.93} radius={radius} i={i + 1} />
    </g>
  );
}

function RoboHand({ grip, hot }) {
  const c = Math.min(1, Math.max(0, grip));

  return (
    <svg
      width="44"
      height="52"
      viewBox="0 0 44 52"
      strokeLinecap="round"
      strokeLinejoin="round"
      // Wrist-top (22, 1) sits exactly on the cursor point.
      style={{ position: "absolute", left: -22, top: -1, overflow: "visible" }}
    >
      <g fill={hot ? FILL_HOT : FILL} stroke={LINE} strokeWidth="1.1">
        {/* strapped cuff, behind the palm */}
        <rect x="14" y="1" width="16" height="9" rx="2" />
        <path d="M14 4h16M14 6.6h16" strokeWidth="0.8" fill="none" />

        {/* thumb: a long bar angled out to the side, folding in as the grip closes */}
        <g transform="translate(10.8 17)">
          <Chain segs={[9.4, 7.2]} angles={[26 - c * 20, 10 - c * 30]} w={6.4} radius={3} />
        </g>

        {/* fingers, under the palm so its lower edge is the knuckle line */}
        {FINGERS.map((f, i) => (
          <g key={i} transform={`translate(${f.x} ${KNUCKLE_Y})`}>
            <Chain
              segs={f.segs}
              angles={[f.side * (1.5 + c * 9 * f.lag), f.side * (3 + c * 26 * f.lag)]}
              w={6.4}
            />
          </g>
        ))}

        {/* back of the hand: narrower at the wrist, widening to the knuckles */}
        <path d="M13 8.4h18l3.6 14.1a3.5 3.5 0 0 1-3.4 4.3H12.8a3.5 3.5 0 0 1-3.4-4.3z" />
        {/* tendons */}
        <path d="M17 11.5v8M22 11v9.5M27 11.5v8" strokeWidth="0.8" opacity="0.5" fill="none" />
      </g>
    </svg>
  );
}
