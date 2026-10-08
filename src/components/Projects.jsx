import { useEffect, useState } from "react";
import { projects } from "../data/content";
import ProjectCard from "./ProjectCard";
import ProjectCaseStudy from "./ProjectCaseStudy";
import SectionHeader from "./SectionHeader";

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
        <SectionHeader eyebrow="Selected Work" title="Projects" className="text-center mb-14 md:mb-20" />

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
