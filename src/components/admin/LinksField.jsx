import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SOCIAL_PLATFORMS } from '@/data/socialPlatforms';

/**
 * Repeater of {platform, url} - stores just the platform id and the URL;
 * the actual Font Awesome icon + brand color are looked up from
 * socialPlatforms.js when the public artist page renders this (see
 * publicArtistsCache.js's adaptFirestoreArtist), so they stay in sync with
 * that preset list instead of being frozen at save time.
 */
export default function LinksField({ label, value, onChange }) {
  const items = value ?? [];

  function update(index, field, val) {
    onChange(items.map((it, i) => (i === index ? { ...it, [field]: val } : it)));
  }
  function remove(index) {
    onChange(items.filter((_, i) => i !== index));
  }
  function add() {
    onChange([...items, { platform: SOCIAL_PLATFORMS[0].id, url: '' }]);
  }

  return (
    <div>
      {label && <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>}

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={item.platform}
              onChange={(e) => update(i, 'platform', e.target.value)}
              className="h-8 w-36 shrink-0 rounded-[2px] border border-input bg-transparent px-2 text-sm text-foreground outline-none"
            >
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <Input value={item.url} onChange={(e) => update(i, 'url', e.target.value)} placeholder="https://..." />
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="shrink-0 hover:text-destructive" aria-label="Remove">
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={add} className="mt-3 gap-1.5">
        <Plus className="size-4" /> Add link
      </Button>
    </div>
  );
}
