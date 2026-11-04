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
 * A small mechanical hand drawn as line-art: palm plate, four jointed fingers
 * and a thumb. `grip` 0..1 curls the fingers in; `hot` brightens the rig.
 */
function RoboHand({ grip, hot }) {
  const c = Math.min(1, Math.max(0, grip));
  const stroke = hot ? "rgba(238,243,255,0.95)" : "rgba(214,222,255,0.8)";
  const joint = hot ? "rgba(255,255,255,0.95)" : "rgba(200,210,255,0.7)";

  // Each finger: knuckle at the top of the palm, curling toward it as c rises.
  const fingers = [0, 1, 2, 3].map((i) => {
    const kx = 9 + i * 5.2;
    const ky = 18;
    const reach = 11 - Math.abs(i - 1.5) * 1.6; // middle fingers longest
    const bend = c * 1.05;
    // mid joint
    const mx = kx + Math.sin(bend) * reach * 0.55;
    const my = ky - Math.cos(bend) * reach * 0.55;
    // tip
    const tx = mx + Math.sin(bend * 2.1) * reach * 0.5;
    const ty = my - Math.cos(bend * 2.1) * reach * 0.5;
    return { kx, ky, mx, my, tx, ty, i };
  });

  const thumbBend = c * 0.9;
  const thx = 7 - Math.cos(thumbBend) * 7;
  const thy = 23 + Math.sin(thumbBend) * 4;

  return (
    <svg
      width="40"
      height="42"
      viewBox="0 0 40 42"
      fill="none"
      /* Hotspot on the fingertips, so a web reeling the hand in meets the grip. */
      style={{ transform: "translate(-18px, -8px)", overflow: "visible" }}
    >
      {/* forearm / wrist block */}
      <rect x="10" y="29" width="16" height="9" rx="2.2" stroke={stroke} strokeWidth="1.3" />
      <path d="M13 38.5h10" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
      {/* palm plate */}
      <path d="M8.5 19.5h19v8.2a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2z" stroke={stroke} strokeWidth="1.3" />
      <path d="M12 24.5h12" stroke={joint} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      {/* thumb */}
      <path
        d={`M8.5 26 L${thx.toFixed(1)},${thy.toFixed(1)}`}
        stroke={stroke}
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx={thx} cy={thy} r="1.5" fill={joint} />
      {/* fingers */}
      {fingers.map((f) => (
        <g key={f.i}>
          <path
            d={`M${f.kx},${f.ky} L${f.mx.toFixed(1)},${f.my.toFixed(1)} L${f.tx.toFixed(1)},${f.ty.toFixed(1)}`}
            stroke={stroke}
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={f.kx} cy={f.ky} r="1.4" fill={joint} />
          <circle cx={f.mx} cy={f.my} r="1.1" fill={joint} opacity="0.85" />
        </g>
      ))}
      {/* grip glow */}
      {c > 0.1 && (
        <circle cx="18" cy="22" r={9 + c * 5} fill="rgba(190,205,255,0.1)" opacity={c} />
      )}
    </svg>
  );
}
