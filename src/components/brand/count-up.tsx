"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { formatNumber } from "@/lib/format";

/**
 * A number that counts up once when it scrolls into view (CSS @property animation, time-based so it
 * always lands on the real value). Server render and no-JS show the final value; the real number is
 * always in the DOM for screen readers.
 */
export function CountUp({ to, delay = 0, className }: { to: number; delay?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPlay(true);
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span className={className}>
      <span ref={ref} className="count-up inline-block text-left" data-play={play || undefined} style={{ "--to": to, "--delay": `${delay}ms`, minWidth: `${String(to).length}ch` } as CSSProperties} aria-hidden />
      <span className="sr-only">{formatNumber(to)}</span>
    </span>
  );
}
