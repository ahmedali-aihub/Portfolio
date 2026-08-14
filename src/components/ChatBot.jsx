import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, BotMessageSquare, Check, Clock, Copy, FolderKanban, Layers3, Loader2, Phone, Send, User, X } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8003";

class ChatError extends Error {}

const SUGGESTIONS = [
  { text: "What are your skills?", icon: Layers3 },
  { text: "Tell me about a project", icon: FolderKanban },
  { text: "What's your experience?", icon: Clock },
  { text: "How can I reach you?", icon: Phone },
];

function renderFormatted(text) {
  // Minimal markdown: **bold** and "- " bullet lines. Deliberately not a
  // full markdown parser — the system prompt only ever asks the model
  // for these two constructs.
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const isBullet = /^\s*-\s+/.test(line);
    const content = line.replace(/^\s*-\s+/, "");
    const parts = content.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={j} className="font-semibold text-[var(--color-ink)]">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={j}>{part}</span>
      )
    );
    if (isBullet) {
      return (
        <div key={i} className="flex gap-2 pl-1">
          <span className="text-[var(--color-silver-dim)] mt-0.5">•</span>
          <span>{parts}</span>
        </div>
      );
    }
    return line.trim() === "" ? <br key={i} /> : <p key={i}>{parts}</p>;
  });
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-0.5 px-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink-faint)]"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [inputFocused, setInputFocused] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onExternalOpen = () => setOpen(true);
    window.addEventListener("toggle-chatbot", onExternalOpen);
    return () => window.removeEventListener("toggle-chatbot", onExternalOpen);
  }, []);

  useEffect(() => {
    if (open) {
      setHasOpenedOnce(true);
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const copyMessage = (text, i) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(i);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const send = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const userMsg = { role: "user", content: trimmed };
    const assistantMsg = { role: "assistant", content: "", model: null, error: false };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });

      if (!res.ok || !res.body) {
        if (res.status === 503) {
          throw new ChatError("The assistant backend is running but isn't fully configured yet (missing API key).");
        }
        if (res.status === 429) {
          throw new ChatError("Too many messages right now — give it a moment and try again.");
        }
        throw new ChatError(`Something went wrong talking to the assistant (status ${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const evt of events) {
          const line = evt.trim();
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (raw === "[DONE]") continue;

          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            continue;
          }

          if (parsed.type === "delta") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              next[next.length - 1] = { ...last, content: last.content + parsed.text, model: parsed.model };
              return next;
            });
          } else if (parsed.type === "error") {
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                ...next[next.length - 1],
                content: "I couldn't reach any model just now — mind trying again in a moment?",
                error: true,
              };
              return next;
            });
          }
        }
      }
    } catch (err) {
      const message =
        err instanceof ChatError ? err.message : "I couldn't connect to the assistant backend. Is it running?";
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: message,
          error: true,
        };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 1.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[70]"
      >
        <motion.span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.55) 0%, transparent 70%)", filter: "blur(16px)" }}
          animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.button
          data-cursor="hover"
          onClick={() => setOpen((v) => !v)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: [
              "0 10px 30px -6px rgba(0,0,0,0.6), 0 0 0px 0px rgba(255,255,255,0)",
              "0 10px 30px -6px rgba(0,0,0,0.6), 0 0 24px 6px rgba(255,255,255,0.55)",
              "0 10px 30px -6px rgba(0,0,0,0.6), 0 0 0px 0px rgba(255,255,255,0)",
            ],
          }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          aria-label="Ask Ahmed's AI assistant"
          className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full"
          style={{
            background: "linear-gradient(150deg, #ffffff 0%, #cdd1d5 45%, #8c9197 100%)",
          }}
        >
        {!hasOpenedOnce && (
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid var(--color-silver-bright)" }}
            animate={{ scale: [1, 1.5, 1.5], opacity: [0.6, 0, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={22} className="text-[var(--color-void)]" />
            </motion.span>
          ) : (
            <motion.span key="s" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <BotMessageSquare size={22} strokeWidth={1.8} className="text-[var(--color-void)]" />
            </motion.span>
          )}
        </AnimatePresence>
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-5 sm:bottom-24 sm:right-6 z-[70] w-[min(92vw,380px)] h-[min(65vh,540px)] sm:h-[min(70vh,540px)] flex flex-col rounded-2xl border border-white/10 overflow-hidden"
            style={{
              background: "linear-gradient(180deg, var(--color-surface-2), var(--color-surface))",
              boxShadow: "0 24px 70px -12px rgba(0,0,0,0.7)",
            }}
          >
            <div className="relative flex items-center gap-3 px-5 py-4 border-b border-[var(--color-line)] shrink-0 overflow-hidden">
              <div
                className="pointer-events-none absolute -top-10 -left-10 w-32 h-32 rounded-full opacity-30"
                style={{ background: "radial-gradient(circle, var(--color-silver-dim) 0%, transparent 70%)", filter: "blur(20px)" }}
              />
              <motion.div
                className="relative w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(150deg, #ffffff 0%, #cdd1d5 45%, #8c9197 100%)" }}
                animate={streaming ? { boxShadow: ["0 0 0 0 rgba(255,255,255,0.25)", "0 0 0 6px rgba(255,255,255,0)"] } : {}}
                transition={{ duration: 1.3, repeat: streaming ? Infinity : 0, ease: "easeOut" }}
              >
                <Bot size={17} className="text-[var(--color-void)]" />
              </motion.div>
              <div className="relative flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-ink)]">Ask about Ahmed</p>
                <p className="text-[11px] text-[var(--color-ink-faint)] flex items-center gap-1.5">
                  <motion.span
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  RAG-powered · skills, experience, projects
                </p>
              </div>
              <button
                data-cursor="hover"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="relative p-1.5 text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div ref={scrollRef} data-lenis-prevent className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && (
                <div>
                  <div className="flex gap-2.5 mb-5">
                    <div className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center bg-[var(--color-void)] border border-[var(--color-line)]">
                      <Bot size={13} className="text-[var(--color-ink-dim)]" />
                    </div>
                    <div className="text-sm text-[var(--color-ink-dim)] leading-relaxed pt-1">
                      Hi — I'm a small RAG assistant trained on Ahmed's portfolio. Ask me about his skills,
                      experience, or projects.
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map(({ text, icon: Icon }) => (
                      <motion.button
                        key={text}
                        data-cursor="hover"
                        onClick={() => send(text)}
                        whileHover={{ y: -2, borderColor: "var(--color-silver-dim)" }}
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-[var(--color-line)] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] transition-colors"
                      >
                        <Icon size={12} className="text-[var(--color-silver-dim)]" />
                        {text}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => {
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className={`group flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center border ${
                        m.role === "user"
                          ? "bg-[var(--color-silver-bright)] border-transparent"
                          : "bg-[var(--color-void)] border-[var(--color-line)]"
                      }`}
                    >
                      {m.role === "user" ? (
                        <User size={13} className="text-[var(--color-void)]" />
                      ) : (
                        <Bot size={13} className="text-[var(--color-ink-dim)]" />
                      )}
                    </div>
                    <div className={`max-w-[78%] ${m.role === "user" ? "text-right" : ""}`}>
                      <div className={`relative flex items-end gap-1.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div
                          className={`inline-block text-left text-sm leading-relaxed px-3.5 py-2.5 rounded-2xl ${
                            m.role === "user"
                              ? "bg-[var(--color-silver-bright)] text-[var(--color-void)] rounded-tr-sm"
                              : `bg-[var(--color-void)] border border-[var(--color-line)] rounded-tl-sm ${
                                  m.error ? "text-red-300" : "text-[var(--color-ink)]"
                                }`
                          }`}
                        >
                          {m.content ? renderFormatted(m.content) : <TypingDots />}
                        </div>

                        {m.role === "assistant" && m.content && !m.error && (
                          <button
                            data-cursor="hover"
                            onClick={() => copyMessage(m.content, i)}
                            aria-label="Copy message"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] shrink-0"
                          >
                            {copiedIndex === i ? (
                              <Check size={12} className="text-emerald-400" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 px-3 py-3 border-t shrink-0 transition-colors"
              style={{ borderColor: inputFocused ? "var(--color-silver-dim)" : "var(--color-line)" }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Ask a question..."
                disabled={streaming}
                className="flex-1 bg-transparent outline-none text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] px-2 disabled:opacity-50"
              />
              <motion.button
                type="submit"
                data-cursor="hover"
                disabled={streaming || !input.trim()}
                aria-label="Send message"
                whileHover={{ scale: streaming || !input.trim() ? 1 : 1.08 }}
                whileTap={{ scale: 0.94 }}
                className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-[var(--color-silver-bright)] disabled:opacity-30 transition-opacity"
              >
                {streaming ? (
                  <Loader2 size={14} className="animate-spin text-[var(--color-void)]" />
                ) : (
                  <Send size={14} className="text-[var(--color-void)]" />
                )}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
