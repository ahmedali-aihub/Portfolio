import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/*
 * A robotic-hand cursor.
 *
 * It follows the mouse, but PullButton can grab it: that component writes an
 * offset into `window.__webPull`, and the hand is drawn at mouse + offset, so
 * a nearby button visibly hauls it in. While gripped the fingers hook and the
 * whole hand swings round to hang from the web, fingers trailing away from the
 * button. Everywhere else it hangs quietly from the pointer.
 *
 * The pointer's hotspot is the top of the wrist, which is also where the web
 * ties on, and the hand rotates about that point.
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
  const stilt = useSpring(tilt, { stiffness: 170, damping: 20 });

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

      // The hand is drawn hanging straight down from its wrist. Pulled by the
      // wrist, it trails: its fingers point away from the button, along the
      // line (ux, uy) from the button to the hand. Rotating (0, 1) onto that
      // direction is atan2(-ux, uy). Eased in with the grip and capped, so a
      // weak pull only nudges it and it never swings fully upside down.
      let deg = 0;
      if (held && g > 0.02) {
        const theta = (Math.atan2(-slot.ux, slot.uy) * 180) / Math.PI;
        deg = Math.max(-100, Math.min(100, theta)) * Math.min(1, g * 2) * (slot.near ?? 1);
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
      // Rotate and scale about the cursor point (the wrist), not the box centre.
      style={{ x: sx, y: sy, rotate: stilt, originX: 0, originY: 0 }}
      animate={{ opacity: visible ? 1 : 0, scale: active ? 1 : hovering ? 0.9 : 0.8 }}
      transition={{ duration: 0.25 }}
    >
      <RoboHand grip={grip} hot={hovering || active} />
    </motion.div>
  );
}

/*
 * The hand is drawn in a 42 x 50 box, with the top of the wrist at (21, 1).
 *
 * It is line-art on an opaque dark fill. The earlier versions were filled
 * silhouettes or bare strokes; at cursor size both fused the fingers into one
 * lump. An outline round each segment keeps every finger, and every joint,
 * readable at 1:1, and the opaque fill lets a finger hide the one it overlaps.
 */

const INK = "#0c0e15"; // fill: near-black, so outlines read against any background
const KNUCKLE_Y = 23;

// Segment lengths for each digit, root to tip. `x` is where it leaves the palm,
// `side` is which way it curls (toward the middle of the hand), `lag` staggers
// the curl so a closing hand ripples rather than moving as one block.
//
// Two segments per finger, not three: with three, each one came out about as
// wide as it was long, and a row of near-circles reads as a bunch of grapes.
// Two long segments keep every finger a finger.
const FINGERS = [
  { x: 12.1, segs: [10.5, 8.2], side: -1, lag: 0.85 },
  { x: 18.0, segs: [11.8, 9.0], side: -1, lag: 0.95 },
  { x: 23.9, segs: [11.2, 8.4], side: 1, lag: 1.0 },
  { x: 29.8, segs: [9.0, 6.8], side: 1, lag: 0.9 },
];

// A finger is a chain of capsules, each hinged at the end of the one before.
// Nested groups give the joints for free: a child inherits its parent's
// rotation, so rotating one joint swings everything beyond it.
function Chain({ segs, angles, w, i = 0 }) {
  if (i >= segs.length) return null;
  return (
    <g transform={`${i ? `translate(0 ${segs[i - 1]}) ` : ""}rotate(${angles[i].toFixed(1)})`}>
      <rect x={-w / 2} y={0} width={w} height={segs[i]} rx={w / 2} />
      <Chain segs={segs} angles={angles} w={w * 0.94} i={i + 1} />
    </g>
  );
}

function RoboHand({ grip, hot }) {
  const c = Math.min(1, Math.max(0, grip));
  const stroke = hot ? "rgba(238,243,255,0.98)" : "rgba(190,202,238,0.9)";

  return (
    <svg
      width="42"
      height="50"
      viewBox="0 0 42 50"
      strokeLinecap="round"
      strokeLinejoin="round"
      // Wrist-top (21, 1) sits exactly on the cursor point.
      style={{ position: "absolute", left: -21, top: -1, overflow: "visible" }}
    >
      {/* grip flare behind the hand */}
      {c > 0.08 && <circle cx="21" cy="26" r={20 + c * 8} fill="rgba(150,170,255,0.09)" opacity={c} />}

      <g fill={INK} stroke={stroke} strokeWidth="1.05">
        {/* wrist cuff, behind the palm */}
        <path d="M15.2 1.4h11.6l1.5 8.4H13.7z" />
        <path d="M14.4 5.4h13.2" strokeWidth="0.8" opacity="0.7" />

        {/* thumb: hinged at the palm's outer edge, folding in as the grip closes */}
        <g transform="translate(9.4 16.5)">
          <Chain segs={[7.8, 6.2]} angles={[30 - c * 26, 12 - c * 40]} w={5.2} />
        </g>

        {/* fingers: slightly relaxed at rest, hooking inward as they grip */}
        {FINGERS.map((f, i) => (
          <g key={i} transform={`translate(${f.x} ${KNUCKLE_Y})`}>
            <Chain
              segs={f.segs}
              angles={[f.side * (2 + c * 16 * f.lag), f.side * (4 + c * 40 * f.lag)]}
              w={4.6}
            />
          </g>
        ))}

        {/* palm, over the roots of the fingers and thumb */}
        <rect x="8.6" y="9" width="24.8" height="17" rx="4.6" />
        {/* tendon lines */}
        <path d="M14 14v8M21 13v9.5M28 14v8" strokeWidth="0.7" opacity="0.4" fill="none" />
        {/* sensor core */}
        <circle cx="21" cy="16.2" r="2.3" fill={hot ? "rgba(168,190,255,0.55)" : "rgba(150,168,220,0.3)"} />
      </g>
    </svg>
  );
}
