import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Terminal, Languages, Puzzle, Search, Database, TestTube2 } from "lucide-react";
import {
  SiLangchain,
  SiLanggraph,
  SiModelcontextprotocol,
  SiAnthropic,
  SiOpenrouter,
  SiHuggingface,
  SiPython,
  SiNumpy,
  SiPandas,
  SiTensorflow,
  SiKeras,
  SiPytorch,
  SiScikitlearn,
  SiJupyter,
  SiMeta,
  SiFastapi,
  SiStreamlit,
  SiDocker,
  SiMysql,
  SiSelenium,
} from "react-icons/si";
import { techStack } from "../data/content";
import Reveal from "./Reveal";

const ICONS = {
  langchain: SiLangchain,
  langgraph: SiLanggraph,
  mcp: SiModelcontextprotocol,
  anthropic: SiAnthropic,
  openrouter: SiOpenrouter,
  huggingface: SiHuggingface,
  bot: Bot,
  terminal: Terminal,
  python: SiPython,
  numpy: SiNumpy,
  pandas: SiPandas,
  tensorflow: SiTensorflow,
  keras: SiKeras,
  pytorch: SiPytorch,
  scikit: SiScikitlearn,
  nlp: Languages,
  shap: Puzzle,
  jupyter: SiJupyter,
  rag: Search,
  database: Database,
  faiss: SiMeta,
  fastapi: SiFastapi,
  streamlit: SiStreamlit,
  docker: SiDocker,
  mysql: SiMysql,
  selenium: SiSelenium,
  playwright: TestTube2,
};

const list = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045 } },
};

const chip = {
  hidden: { opacity: 0, y: 8, scale: 0.94 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

function SkillChip({ item }) {
  const [hovered, setHovered] = useState(false);
  const Icon = ICONS[item.icon];

  return (
    <motion.span
      variants={chip}
      data-cursor="hover"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -3, scale: 1.06 }}
      transition={{ type: "spring", stiffness: 350, damping: 18 }}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[var(--color-ink-dim)] border border-transparent transition-colors duration-200"
      style={{
        backgroundColor: hovered ? `color-mix(in srgb, ${item.color} 14%, transparent)` : "transparent",
        borderColor: hovered ? `color-mix(in srgb, ${item.color} 35%, transparent)` : "transparent",
        color: hovered ? "var(--color-ink)" : undefined,
      }}
    >
      <Icon
        size={14}
        style={{ color: item.color }}
        className="opacity-80 transition-all duration-200"
      />
      {item.label}
    </motion.span>
  );
}

export default function TechStack() {
  return (
    <section id="stack" className="relative py-24 md:py-32 px-6 md:px-10 scroll-mt-24">
      <Reveal className="text-center mb-16 md:mb-20">
        <p className="font-heading text-xs uppercase tracking-[0.25em] text-[var(--color-ink-faint)] mb-4">
          Skills
        </p>
        <h2 className="font-display text-4xl sm:text-5xl font-medium tracking-tight text-[var(--color-ink)]">
          Technical stack
        </h2>
      </Reveal>

      <div className="max-w-5xl mx-auto grid sm:grid-cols-2 gap-x-16 gap-y-14 border-t border-[var(--color-line)] pt-14">
        {techStack.map((cat, i) => (
          <Reveal key={cat.group} delay={i * 0.06}>
            <h3 className="font-heading font-semibold text-lg text-[var(--color-ink)] mb-2">
              {cat.group}
            </h3>
            <p className="text-sm text-[var(--color-ink-faint)] mb-5 max-w-sm leading-relaxed">
              {cat.description}
            </p>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={list}
              className="flex flex-wrap gap-1.5 -ml-3"
            >
              {cat.items.map((item) => (
                <SkillChip key={item.label} item={item} />
              ))}
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
