import { motion } from "framer-motion";
import { profile } from "../data/content";
import ChromeText from "./ChromeText";
import MagneticButton from "./MagneticButton";
import MoonOrb from "./MoonOrb";
import Typewriter from "./Typewriter";

const word = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const line = {
  hidden: { y: "110%" },
  visible: { y: "0%", transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function Hero({ loaded = true }) {
  return (
    <section id="top" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 md:px-10 pt-28 pb-28 sm:pb-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-1/2 -translate-x-1/2 top-[-22%] w-[clamp(200px,25vw,300px)]"
        >
          <MoonOrb />
        </motion.div>

        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{ background: "radial-gradient(ellipse 60% 45% at 50% 20%, var(--color-silver-dim) 0%, transparent 70%)", filter: "blur(60px)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--color-void)]" />
      </div>

      <div className="relative max-w-3xl mx-auto w-full text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: loaded ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          className="font-heading font-semibold text-xs md:text-sm uppercase tracking-[0.25em] text-[var(--color-ink)] mb-6 min-h-[1.2em]"
          style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
        >
          <Typewriter
            text={`${profile.title} — ${profile.subtitle}`}
            speed={32}
            startDelay={250}
            start={loaded}
          />
        </motion.p>

        <motion.h1
          initial="hidden"
          animate={loaded ? "visible" : "hidden"}
          variants={word}
          className="font-display leading-[1.04] tracking-tight text-5xl sm:text-6xl lg:text-7xl"
        >
          <span className="block overflow-hidden">
            <motion.span
              variants={line}
              className="block font-semibold text-[var(--color-ink)]"
              style={{ textShadow: "0 4px 20px rgba(0,0,0,0.85)" }}
            >
              I'm
            </motion.span>
          </span>
          <span className="block overflow-hidden">
            <motion.span variants={line} className="block">
              <ChromeText text="Ahmed Ali" className="block font-bold" />
            </motion.span>
          </span>
        </motion.h1>

        <motion.p
          custom={0.85}
          initial="hidden"
          animate={loaded ? "visible" : "hidden"}
          variants={fadeUp}
          className="mt-8 max-w-lg mx-auto text-[var(--color-silver)] text-lg md:text-xl italic leading-relaxed"
          style={{ fontFamily: "var(--font-quote)", fontWeight: 400 }}
        >
          {profile.tagline}
        </motion.p>

        <motion.div
          custom={1.05}
          initial="hidden"
          animate={loaded ? "visible" : "hidden"}
          variants={fadeUp}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <MagneticButton
            as="a"
            {...{ href: "#work" }}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-silver-bright)] px-8 py-3.5 font-heading text-sm font-semibold text-[var(--color-void)] transition-transform"
          >
            View Work
          </MagneticButton>
          <MagneticButton
            as="a"
            {...{ href: "#contact" }}
            className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 font-heading text-sm font-semibold text-[var(--color-ink)] border border-[var(--color-line)] transition-colors hover:border-[var(--color-silver-dim)]"
          >
            Contact Me
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  );
}
