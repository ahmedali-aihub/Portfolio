import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLenis } from "lenis/react";
import {
  Search,
  Home,
  User,
  Layers3,
  FolderKanban,
  Clock,
  Phone,
  Copy,
  Check,
  Sparkles,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Command as CommandIcon,
} from "lucide-react";
import { profile, projects } from "../data/content";
import { GithubIcon, LinkedinIcon } from "./icons";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  const lenis = useLenis();

  const goTo = useCallback(
    (hash) => {
      const el = document.querySelector(hash);
      if (!el) return;
      if (lenis) {
        lenis.scrollTo(el, { offset: -96, duration: 1.1 });
      } else {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [lenis]
  );

  const commands = useMemo(() => {
    const assistant = [
      {
        id: "ask-ai",
        label: "Ask Ahmed's AI Assistant",
        keywords: "chat rag chatbot ask assistant questions",
        icon: Sparkles,
        group: "Assistant",
        action: () => window.dispatchEvent(new CustomEvent("toggle-chatbot")),
      },
    ];

    const nav = [
      { id: "top", label: "Home", keywords: "top hero start", icon: Home, action: () => goTo("#top") },
      { id: "about", label: "About", keywords: "bio who is ahmed", icon: User, action: () => goTo("#about") },
      { id: "stack", label: "Technical Stack", keywords: "skills tools tech", icon: Layers3, action: () => goTo("#stack") },
      { id: "work", label: "Projects", keywords: "work portfolio case studies", icon: FolderKanban, action: () => goTo("#work") },
      { id: "experience", label: "Experience", keywords: "career journey timeline job", icon: Clock, action: () => goTo("#experience") },
      { id: "contact", label: "Contact", keywords: "email phone reach get in touch", icon: Phone, action: () => goTo("#contact") },
    ].map((c) => ({ ...c, group: "Navigate" }));

    const projectCmds = projects.map((p) => ({
      id: p.id,
      label: p.name,
      keywords: `${p.category} ${p.stack.join(" ")}`,
      icon: FolderKanban,
      group: "Projects",
      action: () => goTo(`#${p.id}`),
    }));

    const connect = [
      {
        id: "github",
        label: "Open GitHub",
        keywords: "code repos git",
        icon: GithubIcon,
        group: "Connect",
        action: () => window.open(profile.github, "_blank", "noreferrer"),
      },
      {
        id: "linkedin",
        label: "Open LinkedIn",
        keywords: "linkedin profile network",
        icon: LinkedinIcon,
        group: "Connect",
        action: () => window.open(profile.linkedin, "_blank", "noreferrer"),
      },
      {
        id: "call",
        label: `Call ${profile.phone}`,
        keywords: "phone number dial",
        icon: Phone,
        group: "Connect",
        action: () => window.open(`tel:${profile.phone.replace(/\s/g, "")}`, "_self"),
      },
      {
        id: "copy-phone",
        label: copied ? "Copied to clipboard" : "Copy phone number",
        keywords: "copy phone clipboard",
        icon: copied ? Check : Copy,
        group: "Connect",
        keepOpen: true,
        action: async () => {
          await navigator.clipboard.writeText(profile.phone);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        },
      },
    ];

    return [...assistant, ...nav, ...projectCmds, ...connect];
  }, [copied, goTo]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.keywords}`.toLowerCase().includes(q));
  }, [commands, query]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((c) => {
      groups[c.group] = groups[c.group] || [];
      groups[c.group].push(c);
    });
    return groups;
  }, [filtered]);

  const runCommand = useCallback((cmd) => {
    cmd.action();
    if (!cmd.keepOpen) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const isK = e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey);
      if (isK) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    const onExternalToggle = () => setOpen((v) => !v);
    window.addEventListener("toggle-command-palette", onExternalToggle);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("toggle-command-palette", onExternalToggle);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = "";
      setQuery("");
    }
  }, [open]);

  const handleListKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[activeIndex];
      if (cmd) runCommand(cmd);
    }
  };

  let runningIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[14vh]"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden"
            style={{
              background: "linear-gradient(180deg, var(--color-surface-2), var(--color-surface))",
              boxShadow: "0 24px 70px -12px rgba(0,0,0,0.7)",
            }}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-line)]">
              <Search size={17} className="text-[var(--color-ink-faint)] shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleListKeyDown}
                placeholder="Search or jump to a section..."
                className="flex-1 bg-transparent outline-none text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] text-sm"
              />
              <kbd className="hidden sm:inline-block text-[10px] font-mono text-[var(--color-ink-faint)] border border-[var(--color-line)] rounded px-1.5 py-0.5">
                ESC
              </kbd>
            </div>

            <div data-lenis-prevent className="max-h-[50vh] overflow-y-auto py-2">
              {filtered.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-[var(--color-ink-faint)]">
                  No results for "{query}"
                </p>
              )}

              {Object.entries(grouped).map(([groupName, items]) => (
                <div key={groupName} className="mb-2 last:mb-0">
                  <p className="px-5 pt-3 pb-1 text-[10px] font-heading font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)]">
                    {groupName}
                  </p>
                  {items.map((cmd) => {
                    runningIndex += 1;
                    const isActive = runningIndex === activeIndex;
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        data-cursor="hover"
                        onMouseEnter={() => setActiveIndex(runningIndex)}
                        onClick={() => runCommand(cmd)}
                        className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                          isActive ? "bg-white/8" : ""
                        }`}
                      >
                        <Icon size={16} className="text-[var(--color-ink-dim)] shrink-0" />
                        <span className="text-sm text-[var(--color-ink)] flex-1 truncate">{cmd.label}</span>
                        {isActive && (
                          <CornerDownLeft size={13} className="text-[var(--color-ink-faint)] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-4 px-5 py-3 border-t border-[var(--color-line)] text-[11px] text-[var(--color-ink-faint)]">
              <span className="flex items-center gap-1.5">
                <ArrowUp size={12} />
                <ArrowDown size={12} />
                Navigate
              </span>
              <span className="flex items-center gap-1.5">
                <CornerDownLeft size={12} />
                Select
              </span>
              <span className="flex items-center gap-1.5 ml-auto">
                <CommandIcon size={12} />K to toggle
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
