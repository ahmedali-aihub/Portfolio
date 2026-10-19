import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];

export function SectionTitle({ id, eyebrow, title, className = "" }) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.8, ease: EASE }}
      className={`scroll-mt-28 mb-8 md:mb-10 ${className}`}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-indigo-300/80 mb-3">{eyebrow}</p>
      <h2 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-[var(--color-ink)]">{title}</h2>
    </motion.div>
  );
}

// Glass card with a soft highlight that follows the pointer.
export function SpotlightCard({ children, className = "", dim = false, active = false }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
  };
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      className={`group relative overflow-hidden rounded-2xl border bg-white/[0.03] backdrop-blur-sm transition-all duration-500 ${
        active ? "border-indigo-300/50 shadow-[0_0_40px_-12px_rgba(129,140,248,0.55)]" : "border-white/10 hover:border-white/25"
      } ${dim ? "opacity-30 saturate-50" : ""} ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(380px circle at var(--x, 50%) var(--y, 0%), rgba(129,140,248,0.13), transparent 60%)" }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

// A skill/tech chip. Clickable chips toggle the page-wide skill filter.
export function Tag({ label, selected = false, onClick, count }) {
  const base = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors";
  const tone = selected
    ? "border-indigo-300/70 bg-indigo-400/20 text-indigo-100"
    : "border-white/10 text-[var(--color-ink-dim)] hover:border-white/30 hover:text-[var(--color-ink)]";
  const badge = count > 0 && (
    <span className={`rounded-full px-1.5 text-[10px] leading-4 ${selected ? "bg-indigo-300/30" : "bg-white/10"}`}>{count}</span>
  );
  if (!onClick) return <span className={`${base} ${tone}`}>{label}</span>;
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} data-cursor="hover" className={`${base} ${tone}`}>
      {label}
      {badge}
    </button>
  );
}

export function CountUp({ value, suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduced = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    if (reduced) {
      setN(value);
      return undefined;
    }
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 1600);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, reduced]);

  return (
    <span ref={ref}>
      {n}
      {suffix}
    </span>
  );
}
