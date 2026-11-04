import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/*
 * A robotic-hand cursor.
 *
 * It follows the mouse, but PullButton can grab it: that component writes an
 * offset into `window.__webPull`, and the hand is drawn at mouse + offset, so
 * a nearby button visibly hauls it in. While gripped the fingers curl and the
 * wrist rolls toward the button. Everywhere else it is a plain open hand.
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
  const stilt = useSpring(tilt, { stiffness: 180, damping: 22 });

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
      const ox = slot?.owner ? slot.x : 0;
      const oy = slot?.owner ? slot.y : 0;
      const g = slot?.owner ? slot.grip : 0;
      x.set(mouse.current.x + ox);
      y.set(mouse.current.y + oy);
      // The hand is drawn hanging straight down from its wrist, so to hang
      // from the web it rotates until the wrist faces the pull. Angles are
      // measured off straight-up (-90deg) and eased in with the grip, and the
      // swing is damped so the hand never reads as fully upside down.
      let deg = 0;
      if (g > 0.02) {
        const pull = (Math.atan2(oy, ox) * 180) / Math.PI; // direction of the haul
        let off = pull + 90; // 0 when the web runs straight up
        if (off > 180) off -= 360;
        if (off < -180) off += 360;
        deg = Math.max(-62, Math.min(62, off * 0.75)) * Math.min(1, g * 2.2);
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
      style={{ x: sx, y: sy, rotate: stilt }}
      animate={{ opacity: visible ? 1 : 0, scale: active ? 1.12 : hovering ? 1.06 : 1 }}
      transition={{ duration: 0.25 }}
    >
      <RoboHand grip={grip} hot={hovering || active} />
    </motion.div>
  );
}

/*
 * A hand hanging from the web, seen from the back: slim wrist at the top
 * where the strands attach, knuckles below it, four fingers hanging down and
 * a thumb folded across the near side. `grip` 0..1 curls the fingers up into
 * the palm, as if hauling on the line.
 *
 * Drawn as filled, tapered digits rather than stick bones, so at cursor size
 * it reads as a hand silhouette instead of a diagram.
 */

// Fingers across the knuckle line, left to right: index to little.
// `len` is the hanging length, `w` the thickness at the knuckle.
//
// These are tuned for legibility at ~30px, not for anatomy: the stroke width
// is kept well under the spacing so a visible gap survives at cursor size,
// and the fingers are short relative to the palm so the hand reads as a hand
// rather than as a palm with sticks hanging off it.
const FINGERS = [
  { x: 9.6, len: 8.2, w: 2.0, lag: 0.82 },
  { x: 13.0, len: 9.2, w: 2.1, lag: 0.92 },
  { x: 16.4, len: 8.6, w: 2.0, lag: 1.0 },
  { x: 19.6, len: 7.2, w: 1.9, lag: 0.9 },
];

const KNUCKLE_Y = 15.0; // where the fingers leave the palm

/*
 * One finger as a tapered capsule hanging from the knuckle, swinging inward
 * and curling as the grip closes. Returns a stroked centre line; the round
 * cap gives the fingertip its shape, and the width tapers toward the tip.
 */
function finger({ x, len, w, lag }, c) {
  // Angles measured from straight down. The first bone swings back toward the
  // palm (negative x) and the second folds further, so a closed grip rolls the
  // fingertips up under the knuckles instead of fanning them out sideways.
  const a1 = Math.PI / 2 + c * 0.62 * lag;
  const a2 = a1 + c * 0.95 * lag;
  // Curling fingers also foreshorten, so a fist is compact rather than long.
  const shrink = 1 - c * 0.26;
  const b1 = len * 0.55 * shrink;
  const b2 = len * 0.45 * shrink;
  const mx = x + Math.cos(a1) * b1;
  const my = KNUCKLE_Y + Math.sin(a1) * b1;
  const tx = mx + Math.cos(a2) * b2;
  const ty = my + Math.sin(a2) * b2;
  return { x, mx, my, tx, ty, w };
}

function RoboHand({ grip, hot }) {
  const c = Math.min(1, Math.max(0, grip));
  const line = hot ? "rgba(242,246,255,0.97)" : "rgba(208,218,250,0.86)";

  const digits = FINGERS.map((f) => finger(f, c));

  // The thumb hinges high on the near edge and hangs out to that side, so it
  // stays clear of the fingers; it folds in across them as the grip closes.
  const ta = Math.PI / 2 + 0.70 - c * 0.34;
  const tmx = 7.4 + Math.cos(ta) * 3.4;
  const tmy = 13.0 + Math.sin(ta) * 3.4;
  const ta2 = ta - 0.70 - c * 0.45;
  const ttx = tmx + Math.cos(ta2) * 2.7;
  const tty = tmy + Math.sin(ta2) * 2.7;

  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      /* Hotspot at the top of the wrist, where the web ties on. */
      style={{ transform: "translate(-15px, -3px)", overflow: "visible" }}
    >
      {/* grip flare behind the hand */}
      {c > 0.08 && (
        <circle cx="15" cy="14" r={7 + c * 6} fill="rgba(170,190,255,0.12)" opacity={c} />
      )}

      {/* Palm and wrist as one solid silhouette. At cursor size an outlined
          box with a cuff on top reads as a bag with a handle, so the shape is
          filled and the wrist blends into the palm rather than sitting on it. */}
      <path
        d="M11.6 3.2h6.0a1.3 1.3 0 0 1 1.3 1.3v2.0h1.4a2.0 2.0 0 0 1 2.0 2.0v5.4a2.3 2.3 0 0 1-2.3 2.3H8.9a2.3 2.3 0 0 1-2.3-2.3V8.5a2.0 2.0 0 0 1 2.0-2.0h1.7v-2.0a1.3 1.3 0 0 1 1.3-1.3z"
        fill={line}
        stroke="none"
      />

      {/* fingers hanging from the knuckle line */}
      {digits.map((d, i) => (
        <path
          key={i}
          d={`M${d.x},${KNUCKLE_Y} L${d.mx.toFixed(1)},${d.my.toFixed(1)} L${d.tx.toFixed(1)},${d.ty.toFixed(1)}`}
          stroke={line}
          strokeWidth={d.w}
        />
      ))}

      {/* thumb last, so it reads in front of the fingers on the near side */}
      <path
        d={`M7.4,13.0 L${tmx.toFixed(1)},${tmy.toFixed(1)} L${ttx.toFixed(1)},${tty.toFixed(1)}`}
        stroke={line}
        strokeWidth="2.3"
      />
    </svg>
  );
}
