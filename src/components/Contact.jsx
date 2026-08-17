import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, ArrowUpRight } from "lucide-react";
import { profile } from "../data/content";
import { GithubIcon, LinkedinIcon } from "./icons";
import Reveal from "./Reveal";
import MagneticButton from "./MagneticButton";
import TiltCard from "./TiltCard";

const links = [
  { label: "GitHub", value: "ahmedali-aihub", href: profile.github, icon: GithubIcon },
  { label: "LinkedIn", value: "ahmed-ali-aiml2006", href: profile.linkedin, icon: LinkedinIcon },
];

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function useHyderabadTime() {
  const [time, setTime] = useState(() => timeFormatter.format(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTime(timeFormatter.format(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

export default function Contact() {
  const localTime = useHyderabadTime();
  return (
    <section id="contact" className="relative py-28 md:py-40 px-6 md:px-10 border-t border-[var(--color-line)] overflow-hidden scroll-mt-24">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.15 }}
          viewport={{ once: true }}
          transition={{ duration: 2 }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60vw] h-[40vw] max-w-2xl rounded-full"
          style={{
            background: "radial-gradient(circle, var(--color-silver-dim) 0%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto text-center">
        <Reveal direction="fade">
          <p className="font-heading text-xs uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-6">
            Get In Touch
          </p>
        </Reveal>

        <Reveal>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-[var(--color-ink)] mb-8">
            Let's connect.
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="text-[var(--color-ink-dim)] max-w-md mx-auto mb-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
            <span className="flex items-center gap-2">
              <MapPin size={15} className="text-[var(--color-ink-faint)]" />
              {profile.location}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-[var(--color-ink-faint)]">
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              {localTime} local time
            </span>
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <MagneticButton
            as="a"
            {...{ href: `tel:${profile.phone.replace(/\s/g, "")}` }}
            className="inline-flex items-center gap-3 rounded-full bg-[var(--color-silver-bright)] px-9 py-4 font-heading text-sm font-semibold text-[var(--color-void)] mt-6"
          >
            Call {profile.phone}
          </MagneticButton>
        </Reveal>

        <Reveal delay={0.2} className="mt-20 flex flex-wrap items-center justify-center gap-4">
          {links.map((link) => (
            <TiltCard
              key={link.label}
              href={link.href}
              external={link.href.startsWith("http")}
              className="justify-center rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-4 min-w-[220px] transition-colors duration-300 hover:border-[var(--color-silver-dim)]"
            >
              <link.icon className="text-[var(--color-ink-faint)] shrink-0 transition-colors group-hover:text-[var(--color-ink)]" size={16} />
              <span className="text-sm text-[var(--color-ink-dim)] transition-colors group-hover:text-[var(--color-ink)]">
                {link.value}
              </span>
              <ArrowUpRight
                size={14}
                className="text-[var(--color-ink-faint)] opacity-0 -translate-y-0.5 translate-x-0.5 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-300 shrink-0"
              />
            </TiltCard>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
