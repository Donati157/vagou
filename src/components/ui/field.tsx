import { cn } from "@/lib/cn";

export const inputClasses =
  "w-full h-11 rounded-md border border-asphalt-200 bg-surface px-3 text-[15px] text-asphalt-900 placeholder:text-asphalt-400 " +
  "transition-colors hover:border-asphalt-300 focus:border-fg focus:outline-none focus:ring-3 focus:ring-green-200 " +
  "disabled:bg-asphalt-50 disabled:text-asphalt-400 aria-invalid:border-danger aria-invalid:ring-red-100";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClasses, "h-auto min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        inputClasses,
        "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%2367736e%22 stroke-width=%222%22 viewBox=%220 0 24 24%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-sm font-medium text-asphalt-700", className)} {...props} />;
}

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string | string[];
  className?: string;
  children: React.ReactNode;
  optional?: boolean;
};

/** Label + control + hint/error, wired for screen readers via ids. */
export function Field({ label, htmlFor, hint, error, className, children, optional }: FieldProps) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label} {optional && <span className="font-normal text-asphalt-400">(opcional)</span>}
      </Label>
      {children}
      {message ? (
        <p id={`${htmlFor}-error`} className="text-sm text-danger" role="alert">
          {message}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-asphalt-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5 text-[15px] text-asphalt-800", className)}>
      <input type="checkbox" className="size-4.5 rounded border-asphalt-300 accent-ink-900" {...props} />
      <span>{label}</span>
    </label>
  );
}
