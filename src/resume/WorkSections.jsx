import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { resume } from "../data/resume";
import { SectionTitle, SpotlightCard, Tag } from "./shared";
import { skillsOf } from "./skills";

const EASE = [0.16, 1, 0.3, 1];

function Chips({ item, selected, onSelect }) {
  const list = [...skillsOf(item)];
  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {list.map((s) => (
        <Tag key={s} label={s} selected={selected === s} onClick={() => onSelect(selected === s ? null : s)} />
      ))}
    </div>
  );
}

const matches = (item, selected) => !selected || skillsOf(item).has(selected);

export function Experience({ selected, onSelect }) {
  return (
    <section id="experience" className="py-14 md:py-20">
      <SectionTitle eyebrow="Experience" title="Where I've been building" />
      <div className="relative space-y-5 pl-7 sm:pl-10">
        <span aria-hidden="true" className="absolute left-[7px] sm:left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-indigo-300/60 via-white/10 to-transparent" />
        {resume.experience.map((job, i) => {
          const current = job.period.endsWith("Present");
          const ok = matches(job, selected);
          return (
            <motion.div
              key={job.org}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.8, delay: i * 0.08, ease: EASE }}
              className="relative"
            >
              <span
                aria-hidden="true"
                className={`absolute -left-7 sm:-left-10 top-7 h-3.5 w-3.5 rounded-full border-2 border-[var(--color-void)] ${
                  current ? "bg-indigo-300 shadow-[0_0_14px_3px_rgba(165,180,252,0.6)]" : "bg-white/40"
                }`}
              />
              <SpotlightCard className="p-5 sm:p-7" dim={!ok} active={Boolean(selected) && ok}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="font-heading text-lg sm:text-xl font-semibold text-[var(--color-ink)]">{job.role}</h3>
                  <span className="font-mono text-xs text-[var(--color-ink-dim)]">{job.period}</span>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-indigo-200/90">
                  {job.org}
                  <span className="text-[var(--color-ink-faint)]">· {job.place}</span>
                  {current && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-200">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" /> Current
                    </span>
                  )}
                </p>
                <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-[var(--color-ink-dim)]">
                  {job.bullets.map((b) => (
                    <li key={b} className="flex gap-3">
                      <span aria-hidden="true" className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-indigo-300" />
                      {b}
                    </li>
                  ))}
                </ul>
                <Chips item={job} selected={selected} onSelect={onSelect} />
              </SpotlightCard>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function ProjectCard({ project, selected, onSelect, index }) {
  const [open, setOpen] = useState(false);
  const ok = matches(project, selected);
  const extra = project.bullets.length > 1;
  const list = open || !extra ? project.bullets : project.bullets.slice(0, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay: (index % 2) * 0.08, ease: EASE }}
    >
      <SpotlightCard className="flex h-full flex-col p-5 sm:p-6" dim={!ok} active={Boolean(selected) && ok}>
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-indigo-300/80">{project.kind}</p>
          {project.link && (
            <a
              href={project.link.href}
              target="_blank"
              rel="noopener noreferrer"
              data-cursor="hover"
              aria-label={`Open ${project.name} on GitHub`}
              className="text-[var(--color-ink-dim)] transition-colors hover:text-[var(--color-ink)]"
            >
              <ArrowUpRight size={16} />
            </a>
          )}
        </div>
        <h3 className="mt-2 font-heading text-lg font-semibold leading-snug text-[var(--color-ink)]">{project.name}</h3>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--color-ink-dim)]">
          {list.map((b) => (
            <li key={b} className="flex gap-2.5">
              <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-indigo-300" />
              {b}
            </li>
          ))}
        </ul>
        {extra && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            data-cursor="hover"
            className="mt-3 inline-flex items-center gap-1 self-start text-xs font-medium text-indigo-200/90 hover:text-indigo-100"
          >
            {open ? "Show less" : `Show ${project.bullets.length - 1} more`}
            <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
        <div className="mt-auto">
          <Chips item={project} selected={selected} onSelect={onSelect} />
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

export function Projects({ selected, onSelect }) {
  return (
    <section id="projects" className="py-14 md:py-20">
      <SectionTitle eyebrow="Projects" title="Things I've shipped" />
      <div className="grid gap-5 md:grid-cols-2">
        {resume.projects.map((p, i) => (
          <ProjectCard key={p.name} project={p} index={i} selected={selected} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

export function Education() {
  return (
    <section id="education" className="py-14 md:py-20">
      <SectionTitle eyebrow="Education" title="Learning alongside the work" />
      <div className="grid gap-5 md:grid-cols-2">
        {resume.education.map((e, i) => {
          const live = e.status === "In progress";
          return (
            <motion.div
              key={e.school}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: EASE }}
            >
              <SpotlightCard className="h-full p-5 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-[var(--color-ink-dim)]">{e.period}</span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                      live ? "border-indigo-300/40 bg-indigo-400/10 text-indigo-200" : "border-white/15 text-[var(--color-ink-dim)]"
                    }`}
                  >
                    {live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-300" />}
                    {e.status}
                  </span>
                </div>
                <h3 className="mt-4 font-heading text-lg font-semibold leading-snug text-[var(--color-ink)]">{e.school}</h3>
                <p className="mt-1 text-[var(--color-ink-dim)]">{e.degree}</p>
              </SpotlightCard>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
