import { about } from "../data/content";
import Reveal from "./Reveal";

export default function About() {
  return (
    <section id="about" className="relative py-24 md:py-32 px-6 md:px-10 scroll-mt-24">
      <div className="max-w-3xl mx-auto">
        <Reveal direction="fade" className="text-center mb-10">
          <p className="font-heading text-xs uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-4">
            About
          </p>
          <h2 className="font-display text-4xl sm:text-5xl font-medium tracking-tight text-[var(--color-ink)]">
            The layer between models and outcomes
          </h2>
        </Reveal>

        <div className="space-y-6 text-left">
          {about.paragraphs.map((p, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <p className="text-base md:text-lg leading-relaxed text-[var(--color-ink-dim)]">
                {p}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
