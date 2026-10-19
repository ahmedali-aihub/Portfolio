import { useState } from "react";
import { motion } from "framer-motion";
import { resume } from "../data/resume";
import { SectionTitle, SpotlightCard, Tag } from "./shared";

// counts: skill -> number of roles/projects that use it.
export default function SkillExplorer({ selected, onSelect, counts }) {
  const [group, setGroup] = useState("All");
  const tabs = ["All", ...resume.skills.map((s) => s.group)];
  const shown = group === "All" ? resume.skills : resume.skills.filter((s) => s.group === group);

  return (
    <section id="skills" className="py-14 md:py-20">
      <SectionTitle eyebrow="Skills" title="Pick a skill, see the proof" />
      <p className="-mt-4 mb-8 max-w-xl text-[var(--color-ink-dim)]">
        Tap any skill to highlight the roles and projects where it was used. A number means it is backed by work below.
      </p>

      <SpotlightCard className="p-5 sm:p-7">
        <div role="tablist" aria-label="Skill categories" className="-mx-1 mb-6 flex gap-1.5 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={group === t}
              data-cursor="hover"
              onClick={() => setGroup(t)}
              className="relative shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium"
            >
              {group === t && (
                <motion.span layoutId="skill-tab" className="absolute inset-0 rounded-full bg-white/10" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
              )}
              <span className={`relative ${group === t ? "text-[var(--color-ink)]" : "text-[var(--color-ink-dim)]"}`}>{t}</span>
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {shown.map((g) => (
            <div key={g.group}>
              <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)]">{g.group}</p>
              <div className="flex flex-wrap gap-2">
                {g.items.map((item) => (
                  <Tag
                    key={item}
                    label={item}
                    count={counts.get(item) ?? 0}
                    selected={selected === item}
                    onClick={() => onSelect(selected === item ? null : item)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </SpotlightCard>
    </section>
  );
}
