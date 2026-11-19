import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Download, Phone } from "lucide-react";
import { profile } from "../data/content";
import { GithubIcon, LinkedinIcon } from "./icons";
import Reveal from "./Reveal";
import MaskText from "./MaskText";
import PullButton from "./PullButton";

const secondary = [
  { label: "LinkedIn", href: profile.linkedin, icon: LinkedinIcon, external: true },
  { label: "GitHub", href: profile.github, icon: GithubIcon, external: true },
  { label: profile.phone, href: `tel:${profile.phone.replace(/\s/g, "")}`, icon: Phone },
  { label: "Download PDF", href: profile.resume, icon: Download, download: "Ahmed-Ali-Resume.pdf" },
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

        <MaskText
          text="Let's connect."
          className="font-display text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-[var(--color-ink)] mb-8"
        />

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

        <Reveal delay={0.18} className="mt-16">
          {/* A pale stage, as in the reference: the web is black ink, so it needs
              a light surface to read on. The web only exists inside it. */}
          <div
            data-pull-zone
            className="relative mx-auto max-w-3xl rounded-[2rem] px-6 py-20 sm:py-24 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-40px_70px_-40px_rgba(70,58,30,0.28),0_40px_90px_-40px_rgba(0,0,0,0.9)] bg-[radial-gradient(120%_90%_at_28%_18%,#f6f3ec,#e6e1d6_68%,#d9d3c7)]"
          >
            <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-12">
              <PullButton
                href={`mailto:${profile.email}`}
                glowClassName="bg-[radial-gradient(closest-side,rgba(40,52,110,0.38),transparent)]"
                className="btn-gloss rounded-full px-14 py-6 font-heading text-[18px] font-bold tracking-tight"
              >
                <span className="relative z-10">let&apos;s collaborate</span>
              </PullButton>
              <PullButton
                href={profile.resume}
                target="_blank"
                rel="noopener noreferrer"
                glowClassName="bg-[radial-gradient(closest-side,rgba(40,52,110,0.18),transparent)]"
                className="btn-ghost-ink rounded-full px-9 py-4 font-heading text-sm font-semibold tracking-tight"
              >
                view my resume
              </PullButton>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.24} className="mt-24">
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-[var(--color-ink-faint)]">
            {secondary.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  data-cursor="hover"
                  {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  {...(item.download ? { download: item.download } : {})}
                  className="group inline-flex items-center gap-2 transition-colors hover:text-[var(--color-ink)]"
                >
                  <item.icon size={15} className="shrink-0" />
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
