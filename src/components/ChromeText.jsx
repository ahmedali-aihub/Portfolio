import { useEffect, useRef, useState } from "react";

export default function ChromeText({ text, className = "" }) {
  const ref = useRef(null);
  const [interactive, setInteractive] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setInteractive(mq.matches);
  }, []);

  useEffect(() => {
    if (!interactive) return;
    const el = ref.current;
    if (!el) return;

    let frame = null;

    const handleMove = (e) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        el.style.setProperty("--mx", `${Math.max(-30, Math.min(130, x))}%`);
        el.style.setProperty("--my", `${Math.max(-30, Math.min(130, y))}%`);
        frame = null;
      });
    };

    const handleLeave = () => {
      el.style.setProperty("--mx", "50%");
      el.style.setProperty("--my", "35%");
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerleave", handleLeave);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerleave", handleLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [interactive]);

  return (
    <span
      ref={ref}
      className={`chrome-text ${interactive ? "" : "chrome-text-auto"} ${className}`}
    >
      {text}
    </span>
  );
}
