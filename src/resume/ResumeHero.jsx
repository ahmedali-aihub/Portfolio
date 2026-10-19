import { motion } from "framer-motion";
import { Download, Mail, MapPin, Phone } from "lucide-react";
import { resume } from "../data/resume";
import { GithubIcon, LinkedinIcon } from "../components/icons";
import { CountUp, SpotlightCard } from "./shared";

const EASE = [0.16, 1, 0.3, 1];
const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 22, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.9, delay, ease: EASE },
});

const ghost =
  "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-[var(--color-ink-dim)] transition-colors hover:border-white/40 hover:text-[var(--color-ink)]";

export default function ResumeHero() {
  const c = resume.contact;
  return (
    <section id="overview" className="grid items-center gap-10 pb-14 pt-32 md:pb-20 md:pt-40 lg:grid-cols-[1.3fr_1fr] lg:gap-14">
      <div>
        <motion.p
          {...rise(0.05)}
          className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-[var(--color-ink-dim)]"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
          </span>
          Working at Yuva Intelli AI Solutions · studying AI &amp; ML
        </motion.p>

        <motion.h1 {...rise(0.15)} className="mt-6 font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
          <span className="text-silver-sheen">{resume.name}</span>
        </motion.h1>

        <motion.p {...rise(0.25)} className="mt-4 font-heading text-lg font-medium text-indigo-200 sm:text-xl">
          {resume.title} <span className="text-[var(--color-ink-faint)]">·</span> {resume.subtitle}
        </motion.p>

        <motion.p {...rise(0.35)} className="mt-5 max-w-xl text-base leading-relaxed text-[var(--color-ink-dim)] sm:text-lg">
          {resume.summary}
        </motion.p>

        <motion.div {...rise(0.45)} className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={resume.pdf}
            download="Ahmed-Ali-Resume.pdf"
            data-cursor="hover"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--color-silver-bright)] px-6 font-heading text-sm font-semibold text-[var(--color-void)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            <Download size={15} strokeWidth={2} /> Download PDF
          </a>
          <a href={`mailto:${c.email}`} data-cursor="hover" aria-label="Email Ahmed" className={ghost}>
            <Mail size={16} />
          </a>
          <a href={c.linkedin} target="_blank" rel="noopener noreferrer" data-cursor="hover" aria-label="LinkedIn" className={ghost}>
            <LinkedinIcon size={16} />
          </a>
          <a href={c.github} target="_blank" rel="noopener noreferrer" data-cursor="hover" aria-label="GitHub" className={ghost}>
            <GithubIcon size={16} />
          </a>
        </motion.div>

        <motion.p {...rise(0.55)} className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--color-ink-faint)]">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} /> {c.location}
          </span>
          <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--color-ink)]">
            <Mail size={14} /> {c.email}
          </a>
          <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--color-ink)]">
            <Phone size={14} /> {c.phone}
          </a>
        </motion.p>
      </div>

      <motion.div {...rise(0.4)}>
        <SpotlightCard className="p-6 sm:p-7">
          <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-ink-faint)]">At a glance</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-7">
            {resume.stats.map((s) => (
              <div key={s.label}>
                <p className="font-display text-4xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-5xl">
                  <CountUp value={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-1.5 text-xs leading-snug text-[var(--color-ink-dim)]">{s.label}</p>
              </div>
            ))}
          </div>
        </SpotlightCard>
      </motion.div>
    </section>
  );
}
