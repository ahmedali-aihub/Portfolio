import { motion } from "framer-motion";
import MaskText from "./MaskText";

// Eyebrow + masked headline + a hairline that draws itself in.
export default function SectionHeader({ eyebrow, title, className = "text-center mb-16 md:mb-20" }) {
  return (
    <div className={className}>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="font-heading text-xs uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-4"
      >
        {eyebrow}
      </motion.p>
      <MaskText
        text={title}
        className="font-display text-4xl sm:text-5xl font-medium tracking-tight text-[var(--color-ink)]"
      />
      <motion.span
        aria-hidden="true"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 1.1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto mt-7 block h-px w-16 origin-center bg-[var(--color-silver-dim)]"
      />
    </div>
  );
}
