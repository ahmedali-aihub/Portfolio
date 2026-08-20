import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bot,
  BotMessageSquare,
  Check,
  Clock,
  Copy,
  Cpu,
  FileText,
  FolderKanban,
  Info,
  Layers3,
  Loader2,
  MessageSquare,
  Phone,
  Search,
  Send,
  User,
  X,
  Zap,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8003";

// A whole answer (model fallback chain included) can legitimately take a
// while on free tiers; only give up well past that.
const REQUEST_TIMEOUT = 75000;
const HEALTH_TIMEOUT = 10000;
// Connection-level failures only, and only before any token has arrived.
const RETRY_DELAYS = [700, 2000];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** An error we already have a useful message for — never retried. */
class ChatError extends Error {}

const SUGGESTIONS = [
  { text: "What are your skills?", icon: Layers3 },
  { text: "Tell me about a project", icon: FolderKanban },
  { text: "What's your experience?", icon: Clock },
  { text: "How can I reach you?", icon: Phone },
];

const PIPELINE_STEPS = [
  {
    icon: MessageSquare,
    title: "You ask a question",
    description: "Typed here, sent straight to the backend the moment you hit send.",
  },
  {
    icon: Search,
    title: "TF-IDF retrieval",
    description:
      "A lightweight keyword-based search finds the most relevant facts from Ahmed's actual skills, projects, and experience — no vector database needed at this corpus size.",
  },
  {
    icon: FileText,
    title: "Context injection",
    description: "The retrieved facts get added to the prompt, so the answer stays grounded in what's real.",
  },
  {
    icon: Cpu,
    title: "LLM fallback chain",
    description:
      "Sent to a free OpenRouter model. If it's rate-limited or down, the next model in the chain automatically takes over.",
  },
  {
    icon: Zap,
    title: "Streamed back live",
    description: "Tokens stream to you token-by-token over SSE, the same way ChatGPT-style interfaces work.",
  },
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
  const [showInfo, setShowInfo] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    const onExternalOpen = () => setOpen(true);
    window.addEventListener("toggle-chatbot", onExternalOpen);
    return () => window.removeEventListener("toggle-chatbot", onExternalOpen);
  }, []);

  // Free-tier hosting (Render) spins the backend down when idle, so the
  // very first chat request after a visitor lands can take 30-50s just to
  // wake it up. Pinging the lightweight health endpoint as soon as the
  // page loads gives it a head start before the visitor ever opens chat.
  // The result also drives the status dot, so a visitor can see the
  // assistant is unreachable before they bother typing a question.
  const probeHealth = useCallback(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT);
    try {
      const res = await fetch(`${API_URL}/api/health`, { signal: controller.signal });
      const ok = res.ok;
      setBackendStatus(ok ? "online" : "offline");
      return ok;
    } catch {
      setBackendStatus("offline");
      return false;
    } finally {
      clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    probeHealth();
  }, [probeHealth]);

  // Abort any in-flight answer if the widget goes away mid-stream.
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (open) {
      setHasOpenedOnce(true);
      if (backendStatus !== "online") probeHealth();
      setTimeout(() => inputRef.current?.focus(), 250);
    }
    // Re-probing is tied to opening, not to every status change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Only real turns go back as history — error bubbles and the empty
    // placeholder would otherwise be replayed to the model as if Ahmed's
    // assistant had actually said them.
    const history = messages
      .filter((m) => !m.error && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content }));

    const userMsg = { role: "user", content: trimmed };
    const assistantMsg = { role: "assistant", content: "", model: null, error: false };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);

    // The placeholder is always last: input is disabled while streaming.
    const patchAnswer = (patch) =>
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], ...patch };
        return next;
      });

    let received = "";
    let model = null;
    let failure = null;

    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      abortRef.current = controller;
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, REQUEST_TIMEOUT);

      try {
        const res = await fetch(`${API_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, history }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          if (res.status === 503) {
            throw new ChatError("The assistant backend is running but isn't fully configured yet (missing API key).");
          }
          if (res.status === 429) {
            throw new ChatError("Too many messages right now — give it a moment and try again.");
          }
          if (res.status >= 500) {
            // Transient server-side hiccup: worth one more shot.
            throw new Error(`server ${res.status}`);
          }
          throw new ChatError(`Something went wrong talking to the assistant (status ${res.status}).`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamError = null;

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
              received += parsed.text;
              model = parsed.model ?? model;
              patchAnswer({ content: received, model });
            } else if (parsed.type === "error") {
              streamError = new ChatError(
                "I couldn't reach any model just now — mind trying again in a moment?"
              );
            }
          }
        }

        if (streamError) throw streamError;
        failure = null;
        setBackendStatus("online");
        break;
      } catch (err) {
        failure = timedOut
          ? new ChatError("That took longer than expected — the model may be busy. Try asking again.")
          : err;

        // Retry only a connection-level failure that produced nothing yet;
        // never replay a request that already streamed part of an answer.
        const retryable = !(failure instanceof ChatError) && received === "";
        if (retryable && attempt < RETRY_DELAYS.length) {
          await sleep(RETRY_DELAYS[attempt]);
          continue;
        }
        break;
      } finally {
        clearTimeout(timer);
        abortRef.current = null;
      }
    }

    if (failure) {
      if (received) {
        // Keep what did arrive rather than replacing a partial answer
        // with an error — the visitor can still read it.
        patchAnswer({ content: `${received}\n\n— the connection dropped mid-answer, ask again for the rest.` });
      } else if (failure instanceof ChatError) {
        patchAnswer({ content: failure.message, error: true });
      } else {
        setBackendStatus("offline");
        patchAnswer({
          content: "I can't reach the assistant backend right now. It may still be waking up — try again in a moment.",
          error: true,
        });
      }
    } else if (!received.trim()) {
      // A stream that closes clean but empty used to leave the typing dots
      // spinning forever with no answer at all.
      patchAnswer({ content: "The model returned an empty answer — mind asking that again?", error: true });
    }

    setStreaming(false);
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
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      backendStatus === "online"
                        ? "bg-emerald-400"
                        : backendStatus === "offline"
                          ? "bg-red-400"
                          : "bg-amber-400"
                    }`}
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  {backendStatus === "offline" ? (
                    <button
                      data-cursor="hover"
                      onClick={probeHealth}
                      className="underline underline-offset-2 hover:text-[var(--color-ink)] transition-colors"
                    >
                      Assistant offline — retry connection
                    </button>
                  ) : (
                    "RAG-powered · skills, experience, projects"
                  )}
                </p>
              </div>
              <button
                data-cursor="hover"
                onClick={() => setShowInfo((v) => !v)}
                aria-label={showInfo ? "Back to chat" : "How this assistant works"}
                className="relative p-1.5 text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors"
              >
                {showInfo ? <ArrowLeft size={16} /> : <Info size={16} />}
              </button>
              <button
                data-cursor="hover"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="relative p-1.5 text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {showInfo ? (
              <div data-lenis-prevent className="flex-1 overflow-y-auto px-5 py-5">
                <p className="text-xs text-[var(--color-ink-faint)] leading-relaxed mb-6">
                  This assistant is a real, working RAG (retrieval-augmented generation) pipeline built for this
                  portfolio — here's exactly what happens between your question and the answer.
                </p>
                <div className="relative">
                  <div className="absolute left-[15px] top-2 bottom-2 w-px bg-[var(--color-line)]" />
                  {PIPELINE_STEPS.map((step, i) => (
                    <motion.div
                      key={step.title}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                      className="relative flex gap-3.5 pb-7 last:pb-0"
                    >
                      <div className="relative z-10 w-[31px] h-[31px] shrink-0 rounded-full flex items-center justify-center bg-[var(--color-void)] border border-[var(--color-line)]">
                        <step.icon size={14} className="text-[var(--color-ink-dim)]" />
                      </div>
                      <div className="pt-1">
                        <p className="text-sm font-semibold text-[var(--color-ink)] mb-1">{step.title}</p>
                        <p className="text-xs text-[var(--color-ink-faint)] leading-relaxed">{step.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
            <>
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
            </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
