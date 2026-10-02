import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

const VARIANTS = {
  primary: "bg-ink-900 text-white hover:bg-ink-800 shadow-xs dark:bg-green-400 dark:text-ink-950 dark:hover:bg-green-300",
  accent: "bg-green-400 text-ink-950 hover:bg-green-300 shadow-xs",
  secondary: "bg-surface text-fg border border-asphalt-200 hover:bg-asphalt-50 hover:border-asphalt-300",
  ghost: "text-fg hover:bg-asphalt-100",
  danger: "bg-danger text-white hover:bg-red-700",
  link: "text-green-700 underline-offset-4 hover:underline px-0 h-auto",
} as const;

const SIZES = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-full",
  md: "h-11 px-4 text-[15px] gap-2 rounded-full",
  lg: "h-13 px-6 text-base gap-2 rounded-full",
  icon: "h-10 w-10 rounded-full",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center font-semibold whitespace-nowrap select-none",
    variant === "link" ? "" : "press",
    "disabled:opacity-50 disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:pointer-events-none",
    VARIANTS[variant],
    variant === "link" ? "" : SIZES[size],
    className,
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({ variant, size, loading, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button className={buttonClasses(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

type LinkButtonProps = React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
