import { focusAreas } from "../data/content";
import Reveal from "./Reveal";

export default function CoreExpertise() {
  return (
    <section className="relative bg-[var(--color-paper)] text-[#141414] rounded-[2rem] md:rounded-[3rem] mx-3 md:mx-6 my-4 py-20 md:py-28 px-6 md:px-14">
      <Reveal>
        <p className="font-heading text-xs uppercase tracking-[0.25em] text-black/40 mb-4">
          Core Expertise
        </p>
        <h2 className="font-display text-4xl sm:text-5xl font-medium tracking-tight mb-16 md:mb-20">
          Where the work happens
        </h2>
      </Reveal>

      <div className="divide-y divide-black/10 border-t border-black/10">
        {focusAreas.map((area, i) => (
          <Reveal key={area.title} delay={i * 0.06}>
            <div className="grid md:grid-cols-12 gap-3 md:gap-8 py-8 md:py-10 items-start">
              <span className="md:col-span-2 font-display text-2xl md:text-3xl font-medium leading-none text-black/35">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="md:col-span-10">
                <h3 className="font-heading font-semibold text-lg md:text-xl mb-2">
                  {area.title}
                </h3>
                <p className="text-black/55 max-w-2xl leading-relaxed">{area.description}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
