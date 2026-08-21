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
const EASE = [0.22, 1, 0.36, 1];
const SEEN_KEY = "portfolio:intro-seen";

// The full intro is a first-impression piece — worth ~3.5s once, tedious
// on every reload. Repeat visits in the same session get a brief version,
// and anyone who asked for less motion gets a near-instant fade.
const TIMINGS = {
  full: { duration: 2100, hold: 320, dissolve: 640, stagger: 0.055, lead: 0.35 },
  short: { duration: 620, hold: 100, dissolve: 320, stagger: 0.02, lead: 0.06 },
  reduced: { duration: 380, hold: 0, dissolve: 260, stagger: 0, lead: 0 },
};

function detectMode() {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "reduced";
    return sessionStorage.getItem(SEEN_KEY) === "1" ? "short" : "full";
  } catch {
    // Private browsing can throw on sessionStorage access.
    return "full";
  }
}

/**
 * Phases: load -> warp -> dissolve (site fades in underneath) -> unmount.
 * Progress is driven by motion values so nothing re-renders per frame.
 */
export default function Preloader({ onReveal, onComplete }) {
  const [mode] = useState(detectMode);
  const t = TIMINGS[mode];
  const still = mode === "reduced";
  // Entrance animations have to fit inside the shortened intros too.
  const sc = mode === "full" ? 1 : mode === "short" ? 0.32 : 0.12;
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
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Non-fatal: the visitor just sees the full intro again.
    }

    const start = performance.now();
    const timers = [];
    let frame;

    const tick = (now) => {
      const p = Math.min(1, (now - start) / t.duration);
      raw.set((1 - Math.pow(1 - p, 2.4)) * 100);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    if (!still) timers.push(setTimeout(() => setWarp(true), t.duration));
    timers.push(
      setTimeout(() => {
        setExiting(true);
        revealRef.current?.(); // hero arrives while the stars are still on screen
      }, t.duration + t.hold),
    );
    timers.push(setTimeout(() => setDone(true), t.duration + t.hold + t.dissolve));

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
    };
  }, [raw, t, still]);

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
          exit={{ opacity: 0, transition: { duration: still ? 0.35 : 0.9, ease: EASE } }}
        >
          {/* backdrop + nebula: fades first so the site appears behind the stars */}
          <motion.div
            className="absolute inset-0 bg-[var(--color-void)]"
            animate={{ opacity: exiting ? 0 : 1 }}
            transition={{ duration: t.dissolve / 1000, ease: EASE }}
          >
            <motion.div
              className="absolute inset-[-20%] preloader-nebula"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.6 * sc, ease: "easeOut" }}
            />
            <div className="absolute inset-0 preloader-galaxy-band" />
            <div className="absolute inset-0 preloader-vignette" />
          </motion.div>

          {/* stars + falling stars: linger over the hero, then dissolve */}
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: exiting ? 0.85 : 1 }}
            transition={{ duration: t.dissolve / 1000, ease: "linear" }}
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
            transition={{ duration: 0.55 * (still ? 0.5 : 1), ease: EASE }}
          >
            <motion.div
              className="relative mb-10"
              initial={{ opacity: 0, scale: still ? 1 : 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.4 * sc, ease: EASE }}
            >
              <div className="preloader-moon-halo" />
              <motion.div
                className="preloader-moon"
                animate={still ? {} : { rotate: 360 }}
                transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="preloader-orbit"
                animate={still ? {} : { rotate: 360 }}
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
                  initial={still ? { opacity: 0 } : { opacity: 0, y: 22, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.9 * sc, delay: t.lead + i * t.stagger, ease: EASE }}
                  className={`text-silver-sheen ${ch === " " ? "w-[0.35em]" : ""}`}
                >
                  {ch === " " ? "\u00A0" : ch}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.05 * sc, duration: 0.9 * sc }}
              className="mt-3 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.42em] text-[var(--color-ink-faint)]"
            >
              Entering the atmosphere
            </motion.p>

            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "clamp(180px, 26vw, 280px)" }}
              transition={{ delay: 0.5 * sc, duration: 1.1 * sc, ease: EASE }}
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
            transition={{ delay: exiting ? 0 : 1.2 * sc, duration: (exiting ? 0.4 : 1) * (still ? 0.4 : 1) }}
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
