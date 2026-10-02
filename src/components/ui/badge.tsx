import { cn } from "@/lib/cn";

const TONES = {
  neutral: "bg-asphalt-100 text-asphalt-700",
  green: "bg-green-100 text-green-700",
  ink: "bg-ink-900 text-white dark:bg-green-400 dark:text-ink-950",
  amber: "bg-status-reserved-bg text-reserved-fg",
  red: "bg-status-occupied-bg text-occupied-fg",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200",
  outline: "border border-asphalt-200 text-asphalt-700 bg-surface",
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({ tone = "neutral", className, children, icon }: { tone?: BadgeTone; className?: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", TONES[tone], className)}>
      {icon}
      {children}
    </span>
  );
}
