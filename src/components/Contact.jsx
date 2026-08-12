import { motion } from "framer-motion";
import { Phone, MapPin, ArrowUpRight } from "lucide-react";
import { profile } from "../data/content";
import { GithubIcon, LinkedinIcon } from "./icons";
import Reveal from "./Reveal";
import MagneticButton from "./MagneticButton";

const links = [
  { label: "GitHub", value: "ahmedali-aihub", href: profile.github, icon: GithubIcon },
  { label: "LinkedIn", value: "ahmed-ali-aiml2006", href: profile.linkedin, icon: LinkedinIcon },
  { label: "Phone", value: profile.phone, href: `tel:${profile.phone.replace(/\s/g, "")}`, icon: Phone },
];

export default function Contact() {
  return (
    <section id="contact" className="relative py-28 md:py-40 px-6 md:px-10 border-t border-[var(--color-line)] overflow-hidden">
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
          <p className="text-[var(--color-ink-dim)] max-w-md mx-auto mb-4 flex items-center justify-center gap-2">
            <MapPin size={15} className="text-[var(--color-ink-faint)]" />
            {profile.location}
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

        <Reveal delay={0.2} className="mt-20 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              data-cursor="hover"
              className="group flex items-center gap-2.5"
            >
              <link.icon className="text-[var(--color-ink-faint)] shrink-0" size={16} />
              <span className="text-sm text-[var(--color-ink-dim)] transition-colors group-hover:text-[var(--color-ink)]">
                {link.value}
              </span>
              <ArrowUpRight
                size={14}
                className="text-[var(--color-ink-faint)] opacity-0 -translate-y-0.5 translate-x-0.5 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-300 shrink-0"
              />
            </a>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
