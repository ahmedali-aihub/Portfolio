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
      // Roll the wrist toward whatever is pulling: the hand points along the
      // web, capped so it never reads as upside down.
      const deg = g > 0.02 ? (Math.atan2(oy, ox) * 180) / Math.PI : 0;
      tilt.set(Math.max(-30, Math.min(30, deg * 0.5)) * Math.min(1, g * 2));
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
 * A small mechanical gripper, drawn facing right so it points along the web
 * that reels it in. Four jointed digits hinge off the front edge of a solid
 * palm, with an opposing thumb beneath; `grip` 0..1 closes them into a fist.
 *
 * Everything is rooted in the palm so the shape reads as one machine rather
 * than a scatter of parts, and the whole rig is drawn small: a cursor has to
 * stay out of the way of what it is pointing at.
 */

// Knuckle positions on the palm's leading edge, with each digit's reach.
// y runs down the edge; the middle digits are longest, as on a hand.
// `lag` staggers the curl slightly per digit, so a closing fist ripples from
// the little finger inward instead of all four collapsing onto one another.
const DIGITS = [
  { y: 6.2, reach: 7.2, lag: 1.00 },
  { y: 9.2, reach: 8.4, lag: 0.90 },
  { y: 12.2, reach: 8.0, lag: 0.80 },
  { y: 15.2, reach: 6.6, lag: 0.70 },
];

const KNUCKLE_X = 14.6; // leading edge of the palm

/*
 * One digit as two bones: knuckle -> mid joint -> tip.
 *
 * Both bones rotate downward as the grip closes, the second a little further
 * than the first, so the digit rolls into a fist instead of folding back
 * through itself. The total sweep is capped below a quarter turn at the
 * knuckle, which keeps the four digits from crossing over one another.
 */
function digit({ y, reach, lag }, c) {
  const a1 = c * 1.15 * lag; // knuckle angle, radians below horizontal
  const a2 = a1 * 1.45; // mid joint continues the curl
  const b1 = reach * 0.56;
  const b2 = reach * 0.46;
  const mx = KNUCKLE_X + Math.cos(a1) * b1;
  const my = y + Math.sin(a1) * b1;
  const tx = mx + Math.cos(a2) * b2;
  const ty = my + Math.sin(a2) * b2;
  return { kx: KNUCKLE_X, ky: y, mx, my, tx, ty };
}

function RoboHand({ grip, hot }) {
  const c = Math.min(1, Math.max(0, grip));
  const line = hot ? "rgba(240,245,255,0.98)" : "rgba(206,216,250,0.82)";
  const plate = hot ? "rgba(150,170,235,0.30)" : "rgba(120,140,210,0.18)";
  const pin = hot ? "#ffffff" : "rgba(214,224,255,0.9)";

  const bones = DIGITS.map((d) => digit(d, c));

  // The thumb hinges at the lower-front corner of the palm and swings forward
  // and up as the grip closes, so it closes against the curling fingers.
  const TX = 13.8;
  const TY = 18.4;
  const ta = -0.30 - c * 0.52; // above horizontal, rising with the grip
  const t1x = TX + Math.cos(ta) * 5.0;
  const t1y = TY + Math.sin(ta) * 5.0;
  const ta2 = ta - 0.55;
  const t2x = t1x + Math.cos(ta2) * 3.8;
  const t2y = t1y + Math.sin(ta2) * 3.8;

  return (
    <svg
      width="34"
      height="30"
      viewBox="0 0 34 30"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      /* Hotspot just ahead of the fingertips, where the web is gripped. */
      style={{ transform: "translate(-25px, -11px)", overflow: "visible" }}
    >
      {/* grip flare, behind everything */}
      {c > 0.08 && (
        <circle cx="24" cy="11" r={5 + c * 7} fill="rgba(170,190,255,0.13)" opacity={c} />
      )}

      {/* forearm cuff */}
      <rect x="1.2" y="7.4" width="5.6" height="8.4" rx="1.6" fill={plate} stroke={line} strokeWidth="1.15" />

      {/* palm: a solid plate the digits actually hinge off */}
      <path
        d="M6.6 5.0h6.2a1.9 1.9 0 0 1 1.9 1.9v10.6a1.9 1.9 0 0 1-1.9 1.9H6.6a1.6 1.6 0 0 1-1.6-1.6V6.6a1.6 1.6 0 0 1 1.6-1.6z"
        fill={plate}
        stroke={line}
        strokeWidth="1.25"
      />
      {/* one quiet seam, not a grille */}
      <path d="M9.0 7.6v9.0" stroke={line} strokeWidth="0.8" opacity="0.4" />

      {/* thumb: two bones opposing the fingers */}
      <path
        d={`M${TX},${TY} L${t1x.toFixed(1)},${t1y.toFixed(1)} L${t2x.toFixed(1)},${t2y.toFixed(1)}`}
        stroke={line}
        strokeWidth="1.35"
      />
      <circle cx={TX} cy={TY} r="1.1" fill={pin} />
      <circle cx={t1x} cy={t1y} r="0.85" fill={pin} opacity="0.9" />

      {/* four digits */}
      {bones.map((b, i) => (
        <g key={i}>
          <path
            d={`M${b.kx},${b.ky} L${b.mx.toFixed(1)},${b.my.toFixed(1)} L${b.tx.toFixed(1)},${b.ty.toFixed(1)}`}
            stroke={line}
            strokeWidth="1.25"
          />
          <circle cx={b.kx} cy={b.ky} r="1.05" fill={pin} />
          <circle cx={b.mx} cy={b.my} r="0.8" fill={pin} opacity="0.85" />
        </g>
      ))}
    </svg>
  );
}
