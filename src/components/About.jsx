import { about } from "../data/content";
import SectionHeader from "./SectionHeader";
import ScrollWords from "./ScrollWords";

export default function About() {
  return (
    <section id="about" className="relative py-24 md:py-32 px-6 md:px-10 scroll-mt-24">
      <div className="max-w-3xl mx-auto">
        <SectionHeader
          eyebrow="About"
          title="The layer between models and outcomes"
          className="text-center mb-14"
        />

        <div className="space-y-7 text-left">
          {about.paragraphs.map((p, i) => (
            <ScrollWords
              key={i}
              text={p}
              className="text-base md:text-lg leading-relaxed text-[var(--color-ink)]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
