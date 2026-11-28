import { cn } from '@/lib/utils';

/** Label + control + optional hint / inline error, shared by the admin forms. */
export default function Field({ label, hint, error, className, children }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-destructive">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted-foreground/80">{hint}</span>
      ) : null}
    </label>
  );
}
