import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import FileUploadField from '@/components/admin/FileUploadField';

/** Repeater of {title, meta, img} - the artist page's Albums row. */
export default function AlbumsField({ value, onChange }) {
  const items = value ?? [];

  function update(index, field, val) {
    onChange(items.map((it, i) => (i === index ? { ...it, [field]: val } : it)));
  }
  function remove(index) {
    onChange(items.filter((_, i) => i !== index));
  }
  function add() {
    onChange([...items, { title: '', meta: '', img: '' }]);
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">Albums</p>

      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="space-y-2 rounded-[2px] border border-border bg-muted/20 p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <Input value={item.title} onChange={(e) => update(i, 'title', e.target.value)} placeholder="Album title" />
                <Input value={item.meta} onChange={(e) => update(i, 'meta', e.target.value)} placeholder="2024 · Album" />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="shrink-0 hover:text-destructive" aria-label="Remove">
                <Trash2 className="size-4" />
              </Button>
            </div>
            <FileUploadField kind="image" value={item.img} onChange={(v) => update(i, 'img', v)} folder="artists/albums" />
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={add} className="mt-3 gap-1.5">
        <Plus className="size-4" /> Add album
      </Button>
    </div>
  );
}
