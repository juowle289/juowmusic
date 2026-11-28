import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Simple page-number pagination over an already-fetched array - admin lists
 * are at most a few hundred rows, so fetching everything once and paging
 * through it client-side is simpler than wiring Firestore cursor pagination,
 * with no real downside at this scale. */
export default function Pagination({ page, pageCount, onChange }) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        Page {page} of {pageCount}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-[2px] border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-juow-accent disabled:opacity-30"
        >
          <ChevronLeft className="size-3.5" /> Prev
        </button>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          className="inline-flex items-center gap-1 rounded-[2px] border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-juow-accent disabled:opacity-30"
        >
          Next <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
