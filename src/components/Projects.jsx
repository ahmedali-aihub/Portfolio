import { useEffect, useState } from "react";
import { projects } from "../data/content";
import ProjectCard from "./ProjectCard";
import ProjectCaseStudy from "./ProjectCaseStudy";
import Reveal from "./Reveal";

export default function Projects() {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selected]);

  return (
    <section id="work" className="relative py-24 md:py-32 px-6 md:px-10 scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-14 md:mb-20">
          <p className="font-heading text-xs uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-4">
            Selected Work
          </p>
          <h2 className="font-display text-4xl sm:text-5xl font-medium tracking-tight text-[var(--color-ink)]">
            Projects
          </h2>
        </Reveal>

        <div className="border-t border-[var(--color-line)]">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onOpen={setSelected} />
          ))}
        </div>
      </div>

      <ProjectCaseStudy project={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
