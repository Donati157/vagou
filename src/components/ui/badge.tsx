import { cn } from "@/lib/cn";

const TONES = {
  neutral: "bg-asphalt-100 text-asphalt-700",
  green: "bg-green-100 text-green-700",
  ink: "bg-ink-900 text-white",
  amber: "bg-status-reserved-bg text-[#8a5d00]",
  red: "bg-status-occupied-bg text-[#a32626]",
  blue: "bg-blue-50 text-blue-700",
  outline: "border border-asphalt-200 text-asphalt-700 bg-white",
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
