import { cn } from "@/lib/cn";

/** Pin + car mark from the Vagou logo. */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 48 60" className={cn("h-8 w-auto", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <ellipse cx="24" cy="56.5" rx="12" ry="2.5" fill="#17382A" />
      <path d="M24 2C12.4 2 3 11.2 3 22.6 3 37.4 21.2 51.4 22.6 52.4a2.3 2.3 0 0 0 2.8 0C26.8 51.4 45 37.4 45 22.6 45 11.2 35.6 2 24 2Z" fill="#5CB874" />
      <circle cx="24" cy="22.5" r="13" fill="#fff" />
      <path
        d="M16.2 27.6v-4.2l2.1-5.7a2.4 2.4 0 0 1 2.3-1.6h6.8a2.4 2.4 0 0 1 2.3 1.6l2.1 5.7v4.2a1 1 0 0 1-1 1h-1.3a1 1 0 0 1-1-1v-1H19.5v1a1 1 0 0 1-1 1h-1.3a1 1 0 0 1-1-1Zm3.6-5.6h8.4l-1.2-3.4a.9.9 0 0 0-.8-.6h-4.4a.9.9 0 0 0-.8.6l-1.2 3.4Zm.2 3a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Zm8 0a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z"
        fill="#17382A"
      />
    </svg>
  );
}

/** Wordmark: "Vag" + pin as "o" + "u", recreated from the brand logo. */
export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  const ink = inverted ? "#FFFFFF" : "var(--color-fg)";
  return (
    <span className={cn("inline-flex items-end font-display leading-none font-bold tracking-[-0.04em] select-none", className)} aria-label="Vagou" role="img">
      <span aria-hidden className="relative" style={{ color: ink }}>
        <span className="relative">
          <span style={{ color: "#5CB874" }} className="absolute inset-0 overflow-hidden" >
            <span className="block w-[0.42em] overflow-hidden">V</span>
          </span>
          V
        </span>
        ag
      </span>
      <LogoMark className="mx-[0.02em] mb-[-0.08em] h-[1.05em]" />
      <span aria-hidden style={{ color: ink }}>u</span>
    </span>
  );
}
