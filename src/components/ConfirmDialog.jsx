import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Shared confirm-then-act dialog, restyled to match the app's actual look
 * (near-black panel, gold accent confirm button, Anton display font for
 * the title) instead of the shadcn/ui defaults (bg-popover grey, generic
 * sans title) that made it look like it belonged to a different app.
 */
export default function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, cancelLabel, destructive, onConfirm, children }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-white/10 bg-[#111] text-juow-soft shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-anton)] text-lg font-normal tracking-wide text-juow-soft">{title}</DialogTitle>
          {description && <DialogDescription className="text-juow-soft/60">{description}</DialogDescription>}
        </DialogHeader>

        {children}

        <DialogFooter className="border-white/10 bg-transparent">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-white/20 bg-transparent text-juow-soft hover:bg-white/10">
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className={destructive ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-juow-accent text-black hover:bg-juow-accent/90'}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
