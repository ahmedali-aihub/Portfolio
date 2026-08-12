import { useEffect, useState } from "react";

export default function Typewriter({ text, speed = 35, startDelay = 0, start = true, className = "", cursorClassName = "", onComplete }) {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!start) return undefined;

    setCount(0);
    setDone(false);

    let interval;
    const startTimer = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        i += 1;
        setCount(i);
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
          onComplete?.();
        }
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(startTimer);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, startDelay, start]);

  return (
    <span className={className}>
      {text.slice(0, count)}
      <span
        aria-hidden="true"
        className={`inline-block w-[2px] h-[0.85em] ml-1 -mb-0.5 bg-current animate-blink-caret ${cursorClassName}`}
        style={{ opacity: done ? undefined : 1 }}
      />
    </span>
  );
}
