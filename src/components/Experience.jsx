import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { experience } from "../data/content";
import Reveal from "./Reveal";

function TimelineItem({ job, index }) {
  const dotRef = useRef(null);
  const active = useInView(dotRef, { margin: "-35% 0px -35% 0px", once: true });

  return (
    <Reveal delay={index * 0.1} className="relative pl-10 mb-14 last:mb-0">
      <span ref={dotRef} className="absolute left-0 top-1.5 -translate-x-1/2 block">
        <motion.span
          className="block w-2.5 h-2.5 rounded-full"
          animate={{
            backgroundColor: active ? "var(--color-silver-bright)" : "var(--color-line)",
            boxShadow: active
              ? "0 0 0 5px color-mix(in srgb, var(--color-silver-bright) 18%, transparent), 0 0 16px 2px rgba(255,255,255,0.55)"
              : "0 0 0 0px transparent",
            scale: active ? 1.15 : 1,
          }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </span>
      <span className="font-heading text-xs font-medium uppercase tracking-[0.15em] text-[var(--color-ink-faint)]">
        {job.period}
      </span>
      <h3 className="font-heading font-semibold text-xl md:text-2xl text-[var(--color-ink)] mt-2 mb-1">
        {job.role}
      </h3>
      <p className="text-[var(--color-ink-dim)] mb-3">{job.org}</p>
      <p className="text-sm text-[var(--color-ink-faint)] leading-relaxed max-w-lg">
        {job.description}
      </p>
    </Reveal>
  );
}

export default function Experience() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.8", "end 0.55"],
  });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="experience" className="relative py-24 md:py-32 px-6 md:px-10 scroll-mt-24">
      <div className="max-w-2xl mx-auto">
        <Reveal className="text-center mb-16 md:mb-20">
          <p className="font-heading text-xs uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-4">
            Professional Journey
          </p>
          <h2 className="font-display text-4xl sm:text-5xl font-medium tracking-tight text-[var(--color-ink)]">
            Experience
          </h2>
        </Reveal>

        <div ref={containerRef} className="relative">
          <div className="absolute left-0 top-2 bottom-2 w-px bg-[var(--color-line)]" />
          <motion.div
            className="absolute left-0 top-2 bottom-2 w-px origin-top"
            style={{
              scaleY: lineScale,
              background: "linear-gradient(180deg, var(--color-silver-bright), var(--color-silver-dim))",
              boxShadow: "0 0 8px 0px rgba(255,255,255,0.45)",
            }}
          />

          {experience.map((job, i) => (
            <TimelineItem key={i} job={job} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
