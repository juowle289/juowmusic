import { cn } from '@/lib/utils';

/** "Published" / "Draft" pill for the admin lists. Docs saved before the
 * status field existed have none and count as published. */
export default function StatusBadge({ status }) {
  const draft = status === 'draft';
  return (
    <span
      className={cn(
        'shrink-0 rounded-[2px] px-2 py-0.5 text-[11px] font-medium',
        draft ? 'bg-muted text-muted-foreground' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      )}
    >
      {draft ? 'Draft' : 'Published'}
    </span>
  );
}
