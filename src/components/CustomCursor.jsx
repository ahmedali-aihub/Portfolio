import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/*
 * The cursor, after the reference video.
 *
 * At rest it is an ordinary black arrow. When a PullButton's web has hold of it,
 * it becomes the hand: PullButton writes an offset into `window.__webPull` and
 * the cursor is drawn at mouse + offset, so the button visibly hauls it in.
 *
 * The hand is fixed. It stands upright with its fingers up and never rotates,
 * tilts or curls, however the web pulls (that was an explicit choice: a hand that
 * turned to hang from the strands read as rotated and wrong). The click point is
 * the tip of the middle finger, which is also where the strands tie on.
 */

export default function CustomCursor() {
  const [visible, setVisible] = useState(false);
  const [pulled, setPulled] = useState(false);

  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const sx = useSpring(x, { stiffness: 900, damping: 42, mass: 0.35 });
  const sy = useSpring(y, { stiffness: 900, damping: 42, mass: 0.35 });

  const mouse = useRef({ x: -200, y: -200 });

  useEffect(() => {
    const move = (e) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      setVisible(true);
    };

    let raf = 0;
    const tick = () => {
      const slot = window.__webPull;
      const held = Boolean(slot?.owner);
      x.set(mouse.current.x + (held ? slot.x : 0));
      y.set(mouse.current.y + (held ? slot.y : 0));

      // The hand only shows while it is really being pulled. With the pointer
      // already on the button there is no web, so it is the arrow.
      const isPulled = held && Math.hypot(slot.x, slot.y) > 5;
      setPulled((prev) => (prev === isPulled ? prev : isPulled));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("mousemove", move);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", move);
    };
  }, [x, y]);

  return (
    <motion.div
      className="cursor-dot"
      // Position only: no rotate.
      style={{ x: sx, y: sy }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div animate={{ opacity: pulled ? 1 : 0 }} transition={{ duration: 0.15 }}>
        <RoboHand />
      </motion.div>
      <motion.div animate={{ opacity: pulled ? 0 : 1 }} transition={{ duration: 0.15 }}>
        <Arrow />
      </motion.div>
    </motion.div>
  );
}

function Arrow() {
  return (
    <svg
      width="18"
      height="26"
      viewBox="0 0 18 26"
      strokeLinejoin="round"
      // The tip, at (1, 1), sits on the cursor point.
      style={{ position: "absolute", left: -1, top: -1, overflow: "visible", filter: "drop-shadow(1.5px 2.5px 2px rgba(0,0,0,0.35))" }}
    >
      <path d="M1 1 L1 20 L5.6 15.6 L8.8 23 L12 21.6 L8.8 14.4 L15 14 Z" fill="#0b0b0e" stroke="#fff" strokeWidth="1.3" />
    </svg>
  );
}

/*
 * A pale, glove-like hand in dark ink. Tall finger bars sit shoulder to shoulder
 * with dark dividers between them, each ends in a short rounded tip past a joint
 * line, a long thumb angles out to one side, and a strapped cuff sits at the
 * wrist. Light fill with dark linework keeps it readable at cursor size, and the
 * dividers keep the fingers apart.
 *
 * It is drawn fingers-down and flipped vertically when placed so the fingers
 * point up. A flip, not a half turn, so the thumb stays on the left. The box is
 * 44 x 52.
 */

const FILL = "#e6eaf4";
const LINE = "#0d1018";
const BOX_H = 52;
const KNUCKLE_Y = 23; // fingers root here, under the palm, which covers the roots

// Segment lengths for each finger, root to tip, and which way it leans (toward
// the middle of the hand) so the fingers are relaxed rather than ruler-straight.
const FINGERS = [
  { x: 12.2, segs: [12.2, 8.6], lean: -1 },
  { x: 18.6, segs: [13.4, 9.4], lean: -1 },
  { x: 25.0, segs: [12.8, 9.0], lean: 1 },
  { x: 31.4, segs: [10.6, 7.6], lean: 1 },
];

// Where the middle fingertip lands in the placed (flipped) box: the click point.
const HOT_X = 19.7;
const HOT_Y = 5.7;

// A finger is a chain of bars, each hinged at the end of the one before.
function Chain({ segs, angles, w, radius = 2.4, i = 0 }) {
  if (i >= segs.length) return null;
  return (
    <g transform={`${i ? `translate(0 ${segs[i - 1]}) ` : ""}rotate(${angles[i]})`}>
      <rect x={-w / 2} y={0} width={w} height={segs[i]} rx={Math.min(radius, w / 2)} />
      <Chain segs={segs} angles={angles} w={w * 0.93} radius={radius} i={i + 1} />
    </g>
  );
}

function RoboHand() {
  return (
    <svg
      width="44"
      height={BOX_H}
      viewBox={`0 0 44 ${BOX_H}`}
      strokeLinecap="round"
      strokeLinejoin="round"
      // The middle fingertip sits exactly on the cursor point.
      style={{ position: "absolute", left: -HOT_X, top: -HOT_Y, overflow: "visible" }}
    >
      <g transform={`translate(0 ${BOX_H}) scale(1 -1)`} fill={FILL} stroke={LINE} strokeWidth="1.1">
        {/* strapped cuff, behind the palm */}
        <rect x="14" y="1" width="16" height="9" rx="2" />
        <path d="M14 4h16M14 6.6h16" strokeWidth="0.8" fill="none" />

        {/* thumb: a long bar angled out to the side */}
        <g transform="translate(10.8 17)">
          <Chain segs={[9.4, 7.2]} angles={[26, 10]} w={6.4} radius={3} />
        </g>

        {/* fingers, under the palm so its lower edge is the knuckle line */}
        {FINGERS.map((f, i) => (
          <g key={i} transform={`translate(${f.x} ${KNUCKLE_Y})`}>
            <Chain segs={f.segs} angles={[f.lean * 1.5, f.lean * 3]} w={6.4} />
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
