import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/**
 * Repeater of {label, value} rows - matches the Bio card's actual structure
 * on the public artist page (a short list of facts like Genre, Formed,
 * Label), instead of one free-text paragraph that doesn't lay out the same
 * way at all.
 */
export default function BioRowsField({ value, onChange }) {
  const items = value ?? [];

  function update(index, field, val) {
    onChange(items.map((it, i) => (i === index ? { ...it, [field]: val } : it)));
  }
  function remove(index) {
    onChange(items.filter((_, i) => i !== index));
  }
  function add() {
    onChange([...items, { label: '', value: '' }]);
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Bio facts (e.g. "Genre" / "Formed" / "Label" - shown as a short list, same as the song pages)
      </p>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={item.label} onChange={(e) => update(i, 'label', e.target.value)} placeholder="Label (e.g. Formed)" className="w-40" />
            <Input value={item.value} onChange={(e) => update(i, 'value', e.target.value)} placeholder="Value (e.g. 2012)" />
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="shrink-0 hover:text-destructive" aria-label="Remove">
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={add} className="mt-3 gap-1.5">
        <Plus className="size-4" /> Add fact
      </Button>
    </div>
  );
}
