import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import StarfieldCanvas from "./StarfieldCanvas";

const NAME = "Ahmed Ali";
const DURATION = 2100; // counting 0 -> 100
const WARP_HOLD = 320; // stars accelerate before anything fades
const DISSOLVE = 640; // scene fades, site is revealed behind the stars
const EASE = [0.22, 1, 0.36, 1];

/**
 * Phases: load -> warp -> dissolve (site fades in underneath) -> unmount.
 * Progress is driven by motion values so nothing re-renders per frame.
 */
export default function Preloader({ onReveal, onComplete }) {
  const [warp, setWarp] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [done, setDone] = useState(false);
  const counterRef = useRef(null);
  const revealRef = useRef(onReveal);
  revealRef.current = onReveal;

  const raw = useMotionValue(0);
  const value = useSpring(raw, { stiffness: 120, damping: 26, mass: 0.5 });
  const scaleX = useTransform(value, [0, 100], [0, 1]);
  const glowLeft = useTransform(value, (v) => `${v}%`);

  useEffect(() => {
    const start = performance.now();
    const timers = [];
    let frame;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION);
      raw.set((1 - Math.pow(1 - t, 2.4)) * 100);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    timers.push(setTimeout(() => setWarp(true), DURATION));
    timers.push(
      setTimeout(() => {
        setExiting(true);
        revealRef.current?.(); // hero arrives while the stars are still on screen
      }, DURATION + WARP_HOLD),
    );
    timers.push(setTimeout(() => setDone(true), DURATION + WARP_HOLD + DISSOLVE));

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
    };
  }, [raw]);

  useEffect(() => {
    const unsub = value.on("change", (v) => {
      if (counterRef.current) {
        counterRef.current.textContent = String(Math.round(v)).padStart(3, "0");
      }
    });
    return unsub;
  }, [value]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[90] overflow-hidden"
          style={{ pointerEvents: exiting ? "none" : "auto" }}
          exit={{ opacity: 0, transition: { duration: 0.9, ease: EASE } }}
        >
          {/* backdrop + nebula: fades first so the site appears behind the stars */}
          <motion.div
            className="absolute inset-0 bg-[var(--color-void)]"
            animate={{ opacity: exiting ? 0 : 1 }}
            transition={{ duration: DISSOLVE / 1000, ease: EASE }}
          >
            <motion.div
              className="absolute inset-[-20%] preloader-nebula"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.6, ease: "easeOut" }}
            />
            <div className="absolute inset-0 preloader-galaxy-band" />
            <div className="absolute inset-0 preloader-vignette" />
          </motion.div>

          {/* stars + falling stars: linger over the hero, then dissolve */}
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: exiting ? 0.85 : 1 }}
            transition={{ duration: DISSOLVE / 1000, ease: "linear" }}
          >
            <StarfieldCanvas warp={warp} />
          </motion.div>

          {/* centre stack: lifts away as the warp begins */}
          <motion.div
            className="relative z-10 h-full flex flex-col items-center justify-center px-6"
            animate={
              exiting
                ? { opacity: 0, y: -18, scale: 1.04 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            transition={{ duration: 0.55, ease: EASE }}
          >
            <motion.div
              className="relative mb-10"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.4, ease: EASE }}
            >
              <div className="preloader-moon-halo" />
              <motion.div
                className="preloader-moon"
                animate={{ rotate: 360 }}
                transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="preloader-orbit"
                animate={{ rotate: 360 }}
                transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
              >
                <span className="preloader-orbit-dot" />
              </motion.div>
            </motion.div>

            <h1
              className="flex font-sans text-3xl sm:text-5xl tracking-tight"
              style={{ filter: "drop-shadow(0 0 22px rgba(255,255,255,0.16))" }}
            >
              {NAME.split("").map((ch, i) => (
                <motion.span
                  key={`${ch}-${i}`}
                  initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.9, delay: 0.35 + i * 0.055, ease: EASE }}
                  className={`text-silver-sheen ${ch === " " ? "w-[0.35em]" : ""}`}
                >
                  {ch === " " ? "\u00A0" : ch}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.05, duration: 0.9 }}
              className="mt-3 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.42em] text-[var(--color-ink-faint)]"
            >
              Entering the atmosphere
            </motion.p>

            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "clamp(180px, 26vw, 280px)" }}
              transition={{ delay: 0.5, duration: 1.1, ease: EASE }}
              className="mt-10 h-px bg-[var(--color-line)] relative overflow-hidden"
            >
              <motion.span
                className="absolute inset-y-0 left-0 w-full bg-silver-sheen origin-left"
                style={{ scaleX }}
              />
              <motion.span className="preloader-progress-glow" style={{ left: glowLeft }} />
            </motion.div>

            <span className="mt-4 font-mono text-[11px] tracking-widest text-[var(--color-ink-faint)] tabular-nums">
              <span ref={counterRef}>000</span>%
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: exiting ? 0 : 1 }}
            transition={{ delay: exiting ? 0 : 1.2, duration: exiting ? 0.4 : 1 }}
            className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between px-6 sm:px-10 pb-6 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-ink-faint)]"
          >
            <span>AI Engineer</span>
            <span className="hidden sm:inline">Portfolio</span>
            <span>© {new Date().getFullYear()}</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
