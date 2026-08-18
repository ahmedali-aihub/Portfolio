import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Reveal from "./Reveal";

export default function ProjectCard({ project, onOpen }) {
  const [hovered, setHovered] = useState(false);
  const clickable = Boolean(project.link || project.caseStudy);
  const Wrapper = project.link ? "a" : clickable ? "button" : "div";
  const wrapperProps = project.link
    ? { href: project.link, target: "_blank", rel: "noreferrer" }
    : project.caseStudy
    ? { type: "button", onClick: () => onOpen(project) }
    : {};

  return (
    <Reveal>
      <Wrapper
        id={project.id}
        {...wrapperProps}
        data-cursor="hover"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="group relative w-full text-left grid md:grid-cols-12 gap-4 md:gap-8 items-start md:items-center py-8 md:py-10 border-b border-[var(--color-line)] transition-colors"
      >
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--color-silver-dim) 6%, transparent), transparent 60%)" }}
        />

        <span className="md:col-span-1 font-display text-2xl md:text-3xl font-medium text-[var(--color-ink-faint)] relative">
          {project.index}
        </span>

        <div className="md:col-span-8 relative">
          <span className="inline-block mb-3 text-[11px] font-heading font-medium uppercase tracking-wider text-[var(--color-ink-faint)]">
            {project.category}
          </span>
          <h3 className="font-heading font-semibold text-xl md:text-2xl text-[var(--color-ink)] mb-2 transition-colors duration-300 group-hover:text-[var(--color-silver-bright)]">
            {project.name}
          </h3>
          <p className="text-sm md:text-base text-[var(--color-ink-dim)] leading-relaxed max-w-2xl mb-3">
            {project.description}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {project.stack.map((tech) => (
              <span key={tech} className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="md:col-span-3 flex md:justify-end relative">
          <span
            className={`inline-flex items-center gap-2 font-heading text-xs font-semibold uppercase tracking-wider ${
              clickable ? "text-[var(--color-ink)]" : "text-[var(--color-ink-faint)]"
            }`}
          >
            {clickable ? "View Details" : "In Progress"}
            <motion.span
              animate={{ rotate: hovered && clickable ? 45 : 0, x: hovered && clickable ? 2 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ArrowUpRight size={16} />
            </motion.span>
          </span>
        </div>
      </Wrapper>
    </Reveal>
  );
}
