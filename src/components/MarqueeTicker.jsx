import { useState } from "react";
import { Search, Bot, Terminal, Database } from "lucide-react";
import {
  SiLanggraph,
  SiLangchain,
  SiModelcontextprotocol,
  SiTensorflow,
  SiPytorch,
  SiScikitlearn,
  SiFastapi,
  SiSelenium,
} from "react-icons/si";
import { marqueeItems } from "../data/content";

const ICONS = {
  search: Search,
  bot: Bot,
  langgraph: SiLanggraph,
  langchain: SiLangchain,
  mcp: SiModelcontextprotocol,
  terminal: Terminal,
  tensorflow: SiTensorflow,
  pytorch: SiPytorch,
  scikit: SiScikitlearn,
  database: Database,
  fastapi: SiFastapi,
  selenium: SiSelenium,
};

export default function MarqueeTicker() {
  const [paused, setPaused] = useState(false);
  const doubled = [...marqueeItems, ...marqueeItems];

  return (
    <section className="relative py-6 border-y border-[var(--color-line)] overflow-hidden">
      <div className="flex overflow-hidden whitespace-nowrap">
        <div
          className="flex items-center shrink-0 animate-marquee-left"
          style={{ animationPlayState: paused ? "paused" : "running" }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {doubled.map((item, i) => {
            const Icon = ICONS[item.icon];
            return (
              <div
                key={i}
                data-cursor="hover"
                className="group flex items-center gap-2 shrink-0 px-4 py-1 cursor-default"
                style={{ "--tc": item.color }}
              >
                <Icon
                  size={15}
                  style={{ color: item.color }}
                  className="opacity-80 transition-all duration-300 group-hover:opacity-100 group-hover:scale-125 group-hover:drop-shadow-[0_0_8px_var(--tc)]"
                />
                <span className="font-heading text-xs uppercase tracking-[0.2em] text-[var(--color-ink-dim)] transition-colors duration-300 group-hover:text-[var(--color-ink)]">
                  {item.label}
                </span>
                <span className="text-[var(--color-line)] text-xs ml-2">•</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
