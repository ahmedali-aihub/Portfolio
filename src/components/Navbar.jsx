import { useEffect, useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { BotMessageSquare } from "lucide-react";

const links = [
  { label: "About", href: "#about" },
  { label: "Skills", href: "#stack" },
  { label: "Work", href: "#work" },
  { label: "Experience", href: "#experience" },
  { label: "Contact", href: "#contact" },
];

const mobileLinks = links.filter((link) =>
  ["#about", "#stack", "#experience"].includes(link.href)
);

export default function Navbar() {
  const { scrollYProgress } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [active, setActive] = useState(null);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setScrolled(v > 0.01);
  });

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
            className="font-heading font-semibold text-sm tracking-tight text-[var(--color-void)] pr-3 md:pr-4 mr-0.5 md:mr-1 border-r border-black/10 shrink-0"
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

          <ul className="flex md:hidden items-center gap-0 font-heading text-[11px] font-medium text-black/60">
            {mobileLinks.map((link) => (
              <li key={link.href} className="relative">
                <a
                  href={link.href}
                  data-cursor="hover"
                  className={`relative z-10 block px-2 py-1.5 rounded-full transition-colors duration-200 ${
                    active === link.href ? "text-black" : "hover:text-black"
                  }`}
                >
                  {link.label}
                </a>
                {active === link.href && (
                  <motion.div
                    layoutId="nav-hover-pill-mobile"
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
            className="md:hidden flex items-center justify-center p-1.5 ml-0.5 shrink-0 text-black/70"
            aria-label="Ask Ahmed's AI assistant"
          >
            <BotMessageSquare size={16} strokeWidth={1.8} />
          </button>
        </motion.nav>
      </motion.div>
  );
}
