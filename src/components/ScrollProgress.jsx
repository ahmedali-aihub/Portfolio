import { motion, useScroll, useSpring } from "framer-motion";

// Hairline reading-progress bar pinned to the top of the viewport.
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left pointer-events-none"
      style={{
        scaleX,
        background: "linear-gradient(90deg, var(--color-silver-dim), var(--color-silver-bright))",
        boxShadow: "0 0 10px 0 rgba(255,255,255,0.35)",
      }}
    />
  );
}
