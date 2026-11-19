import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/*
 * The cursor, after the reference video.
 *
 * At rest it is an ordinary black arrow. When a PullButton's web has hold of it,
 * it becomes a line-drawn fist hanging off the end of the strands: PullButton
 * writes an offset into `window.__webPull` and the cursor is drawn at
 * mouse + offset, so the button visibly hauls it in, and the web writes the
 * direction its strands are running in, which the fist tilts to follow, like
 * something dangling from a rope.
 *
 * Both are anchored at their hotspot: the arrow's tip, and the top of the fist's
 * wrist, which is where the strands tie on.
 */

export default function CustomCursor() {
  const [visible, setVisible] = useState(false);
  const [pulled, setPulled] = useState(false);

  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const sx = useSpring(x, { stiffness: 900, damping: 42, mass: 0.35 });
  const sy = useSpring(y, { stiffness: 900, damping: 42, mass: 0.35 });
  const tilt = useMotionValue(0);
  // Underdamped: a hand on a rope overshoots a little and settles.
  const stilt = useSpring(tilt, { stiffness: 120, damping: 11 });

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
      const off = held ? Math.hypot(slot.x, slot.y) : 0;
      x.set(mouse.current.x + (held ? slot.x : 0));
      y.set(mouse.current.y + (held ? slot.y : 0));

      // The fist only shows while it is really being pulled. With the pointer
      // already on the button there is no web to hang from, so it is the arrow.
      const isPulled = off > 5;
      setPulled((prev) => (prev === isPulled ? prev : isPulled));

      // Hang it like a pendulum: gravity pulls straight down, the strands pull
      // along (dir.x, dir.y), and it settles between the two, so the fist always
      // hangs down-ish and never sideways. Turning "down" onto (dx, dy) is
      // atan2(-dx, dy), capped, and eased in with how far it is being pulled.
      let deg = 0;
      if (isPulled && slot.dir) {
        const dx = slot.dir.x * 0.85;
        const dy = slot.dir.y * 0.85 + 1;
        const theta = (Math.atan2(-dx, dy) * 180) / Math.PI;
        deg = Math.max(-60, Math.min(60, theta)) * Math.min(1, off / 30);
      }
      tilt.set(deg);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("mousemove", move);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", move);
    };
  }, [x, y, tilt]);

  return (
    <motion.div
      className="cursor-dot"
      style={{ x: sx, y: sy }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Rotate about the wrist, which sits on the cursor point. */}
      <motion.div
        style={{ rotate: stilt, originX: 0, originY: 0 }}
        animate={{ opacity: pulled ? 1 : 0 }}
        transition={{ duration: 0.15 }}
      >
        <Fist />
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
 * A line-drawn fist, seen from the back, hanging by its wrist: white paper-fill,
 * ink outline drawn twice with a slight offset so it looks pencilled rather
 * than vector. A strapped wrist at the top, a back of the hand with tendon
 * marks, four folded fingers at the bottom and the thumb down one side. Fixed
 * pose; it does not animate beyond swinging with the strands.
 *
 * The box is 44 x 54 with the top of the wrist at (22, 1).
 */

const PAPER = "#f6f3ec";
const INK = "#121216";

function FistShapes({ fill, stroke, width }) {
  return (
    <g fill={fill} stroke={stroke} strokeWidth={width}>
      {/* wrist and strap */}
      <path d="M16.5 1.5 L15.5 11 H28.5 L27.5 1.5" />
      <rect x="14.2" y="9" width="15.6" height="4.6" rx="1.6" />
      {/* four folded fingers */}
      <rect x="8.6" y="28" width="6.6" height="14.5" rx="3.3" />
      <rect x="15.2" y="28" width="6.6" height="15.5" rx="3.3" />
      <rect x="21.8" y="28" width="6.6" height="15" rx="3.3" />
      <rect x="28.4" y="28" width="6.6" height="13.5" rx="3.3" />
      {/* back of the hand */}
      <path d="M13 13.4 H31 Q35.6 13.4 36 18.4 L36.6 27 Q36.6 31 32.6 31 H11.4 Q7.4 31 7.4 27 L8 18.4 Q8.4 13.4 13 13.4 Z" />
      {/* thumb */}
      <path d="M9.2 15.4 Q2.6 18 3 25.6 Q3.4 31.4 9 30.4 Z" />
    </g>
  );
}

function Fist() {
  return (
    <svg
      width="44"
      height="54"
      viewBox="0 0 44 54"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ position: "absolute", left: -22, top: -1, overflow: "visible" }}
    >
      <FistShapes fill={PAPER} stroke={INK} width="1.6" />
      {/* the same outline again, nudged and fainter: the pencilled look */}
      <g transform="translate(0.55 0.45)" opacity="0.4">
        <FistShapes fill="none" stroke={INK} width="1" />
      </g>
      {/* tendon marks and the joint line across the fingers */}
      <path d="M16 17.4v8M22 16.8v9M28 17.4v8" stroke={INK} strokeWidth="1" opacity="0.5" fill="none" />
      <path d="M9.4 35.4 Q22 37.4 34.6 35.4" stroke={INK} strokeWidth="1" opacity="0.55" fill="none" />
    </svg>
  );
}
