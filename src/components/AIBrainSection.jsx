import AIBrain from "./AIBrain";
import Reveal from "./Reveal";
import SectionHeader from "./SectionHeader";

export default function AIBrainSection() {
  return (
    <section id="intelligence" className="relative py-20 md:py-28 px-4 md:px-10 overflow-hidden scroll-mt-24">
      <SectionHeader eyebrow="Intelligence" title="Where the thinking happens" className="text-center mb-10 md:mb-14" />
      <Reveal direction="scale" duration={1.2} amount={0.2}>
        <AIBrain />
      </Reveal>
      <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
        Move across the cortex <span className="mx-2 text-[var(--color-silver-dim)]">·</span> click the core
      </p>
    </section>
  );
}
