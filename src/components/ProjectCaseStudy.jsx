import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Cloud, Database, Link2, Store, X } from "lucide-react";

const ICONS = {
  database: Database,
  brain: Brain,
  store: Store,
  link: Link2,
  cloud: Cloud,
};

export default function ProjectCaseStudy({ project, onClose }) {
  const cs = project?.caseStudy;

  useEffect(() => {
    if (!project) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [project, onClose]);

  return (
    <AnimatePresence>
      {project && cs && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            data-lenis-prevent
            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 top-[4vh] bottom-[4vh] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[min(92vw,720px)] z-[91] rounded-3xl border border-white/10 overflow-hidden flex flex-col"
            style={{
              background: "linear-gradient(180deg, var(--color-surface-2), var(--color-surface))",
              boxShadow: "0 30px 90px -12px rgba(0,0,0,0.8)",
            }}
          >
            <div className="relative px-6 sm:px-10 pt-8 sm:pt-10 pb-8 border-b border-[var(--color-line)] shrink-0 overflow-hidden">
              <div
                className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-25"
                style={{ background: "radial-gradient(circle, var(--color-silver-dim) 0%, transparent 70%)", filter: "blur(40px)" }}
              />
              <button
                data-cursor="hover"
                onClick={onClose}
                aria-label="Close case study"
                className="absolute top-5 right-5 sm:top-6 sm:right-6 p-2 rounded-full border border-[var(--color-line)] text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] hover:border-[var(--color-silver-dim)] transition-colors"
              >
                <X size={16} />
              </button>

              <p className="font-heading text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-ink-faint)] mb-3">
                {project.category}
              </p>
              <h3 className="font-display text-2xl sm:text-4xl font-medium tracking-tight text-[var(--color-ink)] mb-4 max-w-lg">
                {project.name}
              </h3>
              <p
                className="text-base sm:text-lg italic text-[var(--color-silver)] max-w-xl leading-relaxed"
                style={{ fontFamily: "var(--font-quote)" }}
              >
                {cs.tagline}
              </p>
            </div>

            <div data-lenis-prevent className="flex-1 overflow-y-auto px-6 sm:px-10 py-8 sm:py-10">
              <p className="text-sm sm:text-base text-[var(--color-ink-dim)] leading-relaxed mb-10 max-w-xl">
                {cs.overview}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-12">
                {cs.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-[var(--color-line)] px-4 py-4 text-center"
                  >
                    <p className="font-display text-2xl sm:text-3xl font-semibold text-[var(--color-ink)] mb-1">
                      {stat.value}
                    </p>
                    <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)] leading-tight">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <p className="font-heading text-xs uppercase tracking-[0.2em] text-[var(--color-ink-faint)] mb-6">
                How it works
              </p>

              <div className="relative">
                <div className="absolute left-[17px] top-2 bottom-2 w-px bg-[var(--color-line)]" />
                {cs.steps.map((step, i) => {
                  const Icon = ICONS[step.icon] ?? Database;
                  return (
                    <motion.div
                      key={step.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                      className="relative flex gap-4 pb-8 last:pb-0"
                    >
                      <div className="relative z-10 w-[35px] h-[35px] shrink-0 rounded-full flex items-center justify-center bg-[var(--color-void)] border border-[var(--color-line)]">
                        <Icon size={15} className="text-[var(--color-ink-dim)]" />
                      </div>
                      <div className="pt-1.5">
                        <p className="text-sm sm:text-base font-semibold text-[var(--color-ink)] mb-1.5">
                          {step.title}
                        </p>
                        <p className="text-sm text-[var(--color-ink-faint)] leading-relaxed max-w-md">
                          {step.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-10 pt-8 border-t border-[var(--color-line)]">
                {project.stack.map((tech) => (
                  <span
                    key={tech}
                    className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)]"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
