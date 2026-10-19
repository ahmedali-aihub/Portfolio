import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { ArrowLeft, Download, Mail, X } from "lucide-react";
import { resume } from "../data/resume";
import ResumeHero from "./ResumeHero";
import SkillExplorer from "./SkillExplorer";
import { Education, Experience, Projects } from "./WorkSections";
import { SectionTitle, SpotlightCard } from "./shared";
import { skillsOf } from "./skills";

const EASE = [0.16, 1, 0.3, 1];
const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "education", label: "Education" },
];

function useScrollSpy(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-40% 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);
  return active;
}

function TopBar({ active }) {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26 });
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto mt-3 flex max-w-6xl items-center justify-between gap-3 rounded-full border border-white/10 bg-[rgba(12,13,20,0.7)] px-3 py-2 pl-5 backdrop-blur-xl sm:mt-4">
        <a href="#overview" data-cursor="hover" className="font-heading text-sm font-semibold tracking-tight text-[var(--color-ink)]">
          {resume.name}
        </a>
        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              data-cursor="hover"
              className={`relative rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                active === s.id ? "text-[var(--color-ink)]" : "text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              }`}
            >
              {active === s.id && (
                <motion.span layoutId="resume-nav" className="absolute inset-0 rounded-full bg-white/10" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
              )}
              <span className="relative">{s.label}</span>
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="/"
            data-cursor="hover"
            className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--color-ink-dim)] transition-colors hover:text-[var(--color-ink)] sm:inline-flex"
          >
            <ArrowLeft size={13} /> Portfolio
          </a>
          <a
            href={resume.pdf}
            download="Ahmed-Ali-Resume.pdf"
            data-cursor="hover"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-silver-bright)] px-4 py-2 font-heading text-xs font-semibold text-[var(--color-void)]"
          >
            <Download size={13} /> PDF
          </a>
        </div>
      </div>
      <motion.div style={{ scaleX: progress }} className="mx-auto mt-2 h-px max-w-6xl origin-left bg-gradient-to-r from-indigo-300 via-violet-300 to-transparent" />
    </header>
  );
}

function FilterPill({ selected, matches, onClear }) {
  return (
    <AnimatePresence>
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="fixed inset-x-4 bottom-5 z-50 mx-auto flex w-fit max-w-full items-center gap-3 rounded-full border border-indigo-300/40 bg-[rgba(20,22,40,0.88)] py-2 pl-5 pr-2 text-sm shadow-[0_10px_40px_-10px_rgba(99,102,241,0.6)] backdrop-blur-xl"
          role="status"
        >
          <span className="text-[var(--color-ink-dim)]">
            Showing work using <strong className="font-semibold text-indigo-100">{selected}</strong>
            <span className="text-[var(--color-ink-faint)]"> · </span>
            {matches} {matches === 1 ? "match" : "matches"}
          </span>
          <button
            type="button"
            onClick={onClear}
            data-cursor="hover"
            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-[var(--color-ink)] transition-colors hover:bg-white/20"
          >
            <X size={12} /> Clear
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Highlights() {
  return (
    <section className="grid gap-4 pb-6 md:grid-cols-3">
      {resume.highlights.map((h, i) => (
        <motion.div
          key={h.title}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, delay: i * 0.08, ease: EASE }}
        >
          <SpotlightCard className="h-full p-5 sm:p-6">
            <p className="font-mono text-[10px] text-indigo-300/80">{String(i + 1).padStart(2, "0")}</p>
            <h3 className="mt-2 font-heading text-base font-semibold text-[var(--color-ink)]">{h.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-dim)]">{h.text}</p>
          </SpotlightCard>
        </motion.div>
      ))}
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="py-16 md:py-24">
      <SpotlightCard className="px-6 py-12 text-center sm:px-12 sm:py-16">
        <SectionTitle eyebrow="Contact" title="Let's build something." className="mb-6" />
        <p className="mx-auto max-w-md text-[var(--color-ink-dim)]">
          Open to conversations about AI/ML, RAG and agentic systems. The fastest way to reach me is email.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={`mailto:${resume.contact.email}`}
            data-cursor="hover"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--color-silver-bright)] px-6 font-heading text-sm font-semibold text-[var(--color-void)] transition-transform hover:scale-[1.03]"
          >
            <Mail size={15} /> {resume.contact.email}
          </a>
          <a
            href={resume.pdf}
            download="Ahmed-Ali-Resume.pdf"
            data-cursor="hover"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 px-6 font-heading text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-white/40"
          >
            <Download size={15} /> Download PDF
          </a>
        </div>
      </SpotlightCard>
    </section>
  );
}

export default function ResumePage() {
  // ?skill=LangChain deep-links to the filtered view, handy for sharing.
  const [selected, setSelected] = useState(() => new URLSearchParams(window.location.search).get("skill"));
  const ids = useMemo(() => SECTIONS.map((s) => s.id), []);
  const active = useScrollSpy(ids);

  // skill -> number of roles/projects using it; also the match count for the pill.
  const { counts, matches } = useMemo(() => {
    const items = [...resume.experience, ...resume.projects];
    const map = new Map();
    items.forEach((it) => skillsOf(it).forEach((s) => map.set(s, (map.get(s) ?? 0) + 1)));
    return { counts: map, matches: (s) => (s ? map.get(s) ?? 0 : 0) };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selected) url.searchParams.set("skill", selected);
    else url.searchParams.delete("skill");
    window.history.replaceState(null, "", url);
  }, [selected]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[var(--color-void)] text-[var(--color-ink)]">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-0">
        <motion.div
          animate={{ x: [0, 40, -20, 0], y: [0, 30, 10, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-[10%] top-[-10%] h-[60vh] w-[60vw] rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, rgba(79,110,255,0.35), transparent 65%)", filter: "blur(70px)" }}
        />
        <motion.div
          animate={{ x: [0, -50, 20, 0], y: [0, 40, -10, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-[10%] top-[10%] h-[55vh] w-[55vw] rounded-full opacity-35"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.32), transparent 65%)", filter: "blur(80px)" }}
        />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, transparent 40%, var(--color-void) 100%)" }} />
      </div>
      <div className="noise-overlay" />

      <TopBar active={active} />

      <main className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
        <ResumeHero />
        <Highlights />
        <SkillExplorer selected={selected} onSelect={setSelected} counts={counts} />
        <Experience selected={selected} onSelect={setSelected} />
        <Projects selected={selected} onSelect={setSelected} />
        <Education />
        <Contact />
        <footer className="pb-10 text-center font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)]">
          © {new Date().getFullYear()} {resume.name}
        </footer>
      </main>

      <FilterPill selected={selected} matches={matches(selected)} onClear={() => setSelected(null)} />
    </div>
  );
}
