import { useEffect, useState } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { BotMessageSquare } from "lucide-react";

const links = [
  { label: "About", href: "#about" },
  { label: "Skills", href: "#stack" },
  { label: "Work", href: "#work" },
  { label: "Experience", href: "#experience" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const { scrollYProgress } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [active, setActive] = useState(null);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setScrolled(v > 0.01);
  });

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    window.dispatchEvent(new CustomEvent("mobile-nav-menu", { detail: { open: menuOpen } }));
  }, [menuOpen]);

  useEffect(() => {
    const sections = links
      .map((link) => document.querySelector(link.href))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(`#${entry.target.id}`);
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const highlighted = hovered ?? active;

  return (
    <>
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="fixed top-4 sm:top-6 inset-x-0 z-50 flex justify-center px-4"
      >
        <motion.nav
          animate={{
            paddingTop: scrolled ? 6 : 8,
            paddingBottom: scrolled ? 6 : 8,
            boxShadow: scrolled
              ? "0 12px 40px -8px rgba(0,0,0,0.55)"
              : "0 8px 24px -8px rgba(0,0,0,0.35)",
          }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-1 rounded-full border border-white/15 pl-5 pr-2 backdrop-blur-xl"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-silver-bright) 96%, transparent), color-mix(in srgb, var(--color-silver) 90%, transparent))",
          }}
        >
          <a
            href="#top"
            data-cursor="hover"
            className="font-heading font-semibold text-sm tracking-tight text-[var(--color-void)] pr-4 mr-1 border-r border-black/10"
          >
            Ahmed Ali
          </a>

          <ul
            className="hidden md:flex items-center gap-0.5 font-heading text-[13px] font-medium text-black/60"
            onMouseLeave={() => setHovered(null)}
          >
            {links.map((link) => (
              <li key={link.href} className="relative">
                <a
                  href={link.href}
                  data-cursor="hover"
                  onMouseEnter={() => setHovered(link.href)}
                  className={`relative z-10 block px-4 py-2 rounded-full transition-colors duration-200 ${
                    highlighted === link.href ? "text-black" : "hover:text-black"
                  }`}
                >
                  {link.label}
                </a>
                {highlighted === link.href && (
                  <motion.div
                    layoutId="nav-hover-pill"
                    className="absolute inset-0 rounded-full bg-black/8"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
              </li>
            ))}
          </ul>

          <motion.button
            data-cursor="hover"
            onClick={() => window.dispatchEvent(new CustomEvent("toggle-chatbot"))}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            aria-label="Ask Ahmed's AI assistant"
            className="hidden md:inline-flex items-center justify-center w-9 h-9 rounded-full border border-black/10 ml-1 text-black/70 hover:text-black hover:border-black/20 transition-colors"
          >
            <BotMessageSquare size={16} strokeWidth={1.8} />
          </motion.button>

          <motion.a
            href="#contact"
            data-cursor="hover"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="hidden md:inline-flex items-center gap-2 rounded-full bg-[var(--color-void)] px-5 py-2 ml-2 font-heading text-xs font-semibold text-white"
          >
            Contact Me
          </motion.a>

          <button
            data-cursor="hover"
            onClick={() => window.dispatchEvent(new CustomEvent("toggle-chatbot"))}
            className="md:hidden flex items-center justify-center p-2 ml-1 text-black/70"
            aria-label="Ask Ahmed's AI assistant"
          >
            <BotMessageSquare size={17} strokeWidth={1.8} />
          </button>

          <button
            data-cursor="hover"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden flex flex-col gap-1.5 z-50 p-2 ml-1"
            aria-label="Toggle menu"
          >
            <motion.span
              animate={menuOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
              className="w-5 h-px bg-[var(--color-void)]"
            />
            <motion.span
              animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
              className="w-5 h-px bg-[var(--color-void)]"
            />
            <motion.span
              animate={menuOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
              className="w-5 h-px bg-[var(--color-void)]"
            />
          </button>
        </motion.nav>
      </motion.div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-40 bg-[var(--color-void)] flex flex-col items-center justify-center gap-8 md:hidden"
          >
            {links.map((link, i) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className={`font-display text-3xl font-medium transition-colors ${
                  active === link.href ? "text-[var(--color-silver-bright)]" : "text-[var(--color-ink)]"
                }`}
              >
                {link.label}
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
