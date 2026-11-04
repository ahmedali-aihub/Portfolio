import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/*
 * A robotic-hand cursor.
 *
 * It follows the mouse, but PullButton can grab it: that component writes an
 * offset into `window.__webPull`, and the hand is drawn at mouse + offset, so
 * a nearby button visibly hauls it in.
 *
 * The hand is fixed. It stands upright with its fingers up, like a normal
 * pointer, and nothing moves it but its position: it does not rotate, tilt or
 * curl its fingers, however the web pulls. The click point is the tip of the
 * middle finger, which is also where the web ties on, so what you point at,
 * what you click and where the strands end are all the same place.
 */

export default function CustomCursor() {
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(false);
  const [grip, setGrip] = useState(0);

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
  }, [x, y]);

  return (
    <motion.div
      className="cursor-dot"
      // Position only: no rotate, and a fixed size.
      style={{ x: sx, y: sy }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.25 }}
    >
      <RoboHand hot={hovering || grip > 0.05} />
    </motion.div>
  );
}

/*
 * Drawn after the hand in the reel this cursor is modelled on: a pale,
 * glove-like hand in dark ink. Tall finger bars sit shoulder to shoulder with
 * dark dividers between them, each ends in a short rounded tip past a joint
 * line, a long thumb angles out to one side, and a strapped cuff sits at the
 * wrist.
 *
 * Light fill with dark linework: the pale mass is what keeps the hand readable
 * at cursor size against the dark page, and the dividers are what keep the
 * fingers apart. Dark-fill versions fused into a lump or into bubbles.
 *
 * It is drawn fingers-down, the way the reel's hand hangs, and flipped
 * vertically when placed so the fingers point up. A flip, not a half turn, so
 * the thumb stays on the left. The box is 44 x 52.
 */

const FILL = "#e6eaf4";
const FILL_HOT = "#f7f9ff";
const LINE = "#0d1018";
const BOX_H = 52;
const KNUCKLE_Y = 23; // fingers root here, under the palm, which covers the roots

// Segment lengths for each finger, root to tip, and which way it leans (toward
// the middle of the hand) so the fingers are relaxed rather than ruler-straight.
// Four 6.4-wide bars across the 26-wide palm leave no gaps, only the dividers.
const FINGERS = [
  { x: 12.2, segs: [12.2, 8.6], lean: -1 },
  { x: 18.6, segs: [13.4, 9.4], lean: -1 },
  { x: 25.0, segs: [12.8, 9.0], lean: 1 },
  { x: 31.4, segs: [10.6, 7.6], lean: 1 },
];

// Where the middle fingertip lands in the placed (flipped) box: this is the
// cursor's click point. The tip's centre line is x = 19.7; its outer edge is
// y = 46.3 in the drawing, so 52 - 46.3 = 5.7 once flipped.
const HOT_X = 19.7;
const HOT_Y = 5.7;

// A finger is a chain of bars, each hinged at the end of the one before. The
// ends are only slightly rounded, so each segment reads as a bar, like the
// reference, not a pill.
function Chain({ segs, angles, w, radius = 2.4, i = 0 }) {
  if (i >= segs.length) return null;
  return (
    <g transform={`${i ? `translate(0 ${segs[i - 1]}) ` : ""}rotate(${angles[i]})`}>
      <rect x={-w / 2} y={0} width={w} height={segs[i]} rx={Math.min(radius, w / 2)} />
      <Chain segs={segs} angles={angles} w={w * 0.93} radius={radius} i={i + 1} />
    </g>
  );
}

function RoboHand({ hot }) {
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
      <g transform={`translate(0 ${BOX_H}) scale(1 -1)`} fill={hot ? FILL_HOT : FILL} stroke={LINE} strokeWidth="1.1">
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
