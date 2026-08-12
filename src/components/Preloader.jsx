import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Preloader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const duration = 1300;
    let frame;

    const tick = (now) => {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (pct < 100) {
        frame = requestAnimationFrame(tick);
      } else {
        setTimeout(() => setDone(true), 400);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[var(--color-void)] px-6"
          exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
        >
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="font-sans text-xl sm:text-2xl tracking-tight text-[var(--color-ink)]"
          >
            Ahmed Ali
          </motion.p>

          <div className="w-40 h-px bg-[var(--color-line)] mt-8 relative overflow-hidden">
            <motion.span
              className="absolute inset-y-0 left-0 bg-silver-sheen"
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear", duration: 0.1 }}
            />
          </div>

          <span className="mt-4 font-mono text-[11px] tracking-widest text-[var(--color-ink-faint)]">
            {progress}%
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
