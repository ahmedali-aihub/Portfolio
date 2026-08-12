import { experience } from "../data/content";
import Reveal from "./Reveal";

export default function Experience() {
  return (
    <section id="experience" className="relative py-24 md:py-32 px-6 md:px-10">
      <div className="max-w-2xl mx-auto">
        <Reveal className="text-center mb-16 md:mb-20">
          <p className="font-heading text-xs uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-4">
            Professional Journey
          </p>
          <h2 className="font-display text-4xl sm:text-5xl font-medium tracking-tight text-[var(--color-ink)]">
            Experience
          </h2>
        </Reveal>

        <div className="relative">
          <div className="absolute left-0 top-2 bottom-2 w-px bg-[var(--color-line)]" />

          {experience.map((job, i) => (
            <Reveal key={i} delay={i * 0.1} className="relative pl-10 mb-14 last:mb-0">
              <span className="absolute left-0 top-1.5 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[var(--color-silver-bright)]" />
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
          ))}
        </div>
      </div>
    </section>
  );
}
