import { profile } from "../data/content";

export default function Footer() {
  return (
    <footer className="px-6 md:px-10 py-8 border-t border-[var(--color-line)]">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--color-ink-faint)]">
        <span>&copy; {new Date().getFullYear()} {profile.name}</span>
        <span>{profile.title} · {profile.subtitle}</span>
      </div>
    </footer>
  );
}
