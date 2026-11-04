import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import GalaxyCanvas from "./GalaxyCanvas";

const NAME = "Ahmed Ali";
const ROLE = "AI / ML Engineer";
const EASE = [0.22, 1, 0.36, 1];
const SEEN_KEY = "portfolio:intro-seen";

// The full intro is a first-impression piece — worth ~3s once, tedious
// on every reload. Repeat visits in the same session get a brief version,
// and anyone who asked for less motion gets a near-instant fade.
const TIMINGS = {
  full: { duration: 2900, hold: 220, dissolve: 1150 },
  short: { duration: 750, hold: 60, dissolve: 650 },
  reduced: { duration: 380, hold: 0, dissolve: 260 },
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
 * Phases: load -> exit (dive into the galaxy, site fades in underneath) -> unmount.
 * Progress is driven by motion values so nothing re-renders per frame.
 */
export default function Preloader({ onReveal, onComplete }) {
  const [mode] = useState(detectMode);
  const t = TIMINGS[mode];
  const still = mode === "reduced";
  // Entrance animations have to fit inside the shortened intros too.
  const sc = mode === "full" ? 1 : mode === "short" ? 0.35 : 0.12;
  const [exiting, setExiting] = useState(false);
  const [done, setDone] = useState(false);
  const counterRef = useRef(null);
  const revealRef = useRef(onReveal);
  revealRef.current = onReveal;

  const raw = useMotionValue(0);
  const value = useSpring(raw, { stiffness: 110, damping: 28, mass: 0.5 });
  const scaleX = useTransform(value, [0, 100], [0, 1]);

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
      raw.set((1 - Math.pow(1 - p, 2.2)) * 100);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    timers.push(
      setTimeout(() => {
        setExiting(true);
        revealRef.current?.(); // hero arrives as the camera dives in
      }, t.duration + t.hold),
    );
    timers.push(setTimeout(() => setDone(true), t.duration + t.hold + t.dissolve));

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
    };
  }, [raw, t]);

  useEffect(() => {
    const unsub = value.on("change", (v) => {
      if (counterRef.current) {
        counterRef.current.textContent = String(Math.round(v)).padStart(3, "0");
      }
    });
    return unsub;
  }, [value]);

  const reveal = (delay) => ({
    initial: still ? { opacity: 0 } : { y: "105%" },
    animate: still ? { opacity: 1 } : { y: "0%" },
    transition: { duration: 1.1 * sc, delay: delay * sc, ease: EASE },
  });
  const fadeOut = { duration: 0.35 };

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[90] overflow-hidden preloader-backdrop"
          style={{ pointerEvents: exiting ? "none" : "auto" }}
          initial={{ opacity: 1 }}
          animate={{ opacity: exiting ? 0 : 1 }}
          transition={
            exiting
              ? { duration: (t.dissolve / 1000) * 0.55, delay: (t.dissolve / 1000) * 0.45, ease: "easeIn" }
              : { duration: 0 }
          }
          exit={{ opacity: 0, transition: { duration: 0.01 } }}
        >
          <GalaxyCanvas progress={value} exiting={exiting} still={still} />
          <div className="absolute inset-0 preloader-vignette" />

          {/* header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: exiting ? 0 : 1 }}
            transition={exiting ? fadeOut : { delay: 0.2 * sc, duration: 0.9 * sc }}
            className="absolute inset-x-0 top-0 flex items-center justify-between px-6 sm:px-10 pt-7 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-ink-dim)]"
          >
            <span>Portfolio</span>
            <span className="hidden sm:block text-[var(--color-ink-faint)]">Move through the field</span>
            <span>© {new Date().getFullYear()}</span>
          </motion.div>

          {/* name, counter, progress */}
          <motion.div
            className="absolute inset-x-0 bottom-0 px-6 sm:px-10 pb-7"
            animate={exiting && !still ? { opacity: 0, y: 14 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <div className="flex items-end justify-between gap-6 mb-6">
              <div>
                <h1 className="font-display text-4xl sm:text-6xl font-medium tracking-tight leading-[1.05]">
                  <span className="block overflow-hidden pb-[0.08em]">
                    <motion.span className="block text-silver-sheen" {...reveal(0.15)}>
                      {NAME}
                    </motion.span>
                  </span>
                </h1>
                <span className="mt-3 block overflow-hidden">
                  <motion.span
                    className="block font-heading text-[11px] sm:text-xs uppercase tracking-[0.35em] text-[var(--color-ink-dim)]"
                    {...reveal(0.45)}
                  >
                    {ROLE}
                  </motion.span>
                </span>
              </div>
              <span className="font-display text-4xl sm:text-5xl font-light tracking-tight tabular-nums text-[var(--color-ink-dim)]">
                <span ref={counterRef}>000</span>
              </span>
            </div>
            <div className="relative h-px w-full bg-[var(--color-line)] overflow-hidden">
              <motion.span
                className="absolute inset-0 bg-[var(--color-silver-bright)] origin-left"
                style={{ scaleX }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
