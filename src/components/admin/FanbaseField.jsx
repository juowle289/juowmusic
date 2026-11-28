import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FANBASE_PLATFORMS } from '@/data/socialPlatforms';

/**
 * Manual fanbase numbers, platform by platform - see the note in
 * AdminArtistForm.jsx for why this is admin-entered rather than fetched
 * live: there's no single, free, CORS-friendly API that covers Spotify/
 * Instagram/TikTok/etc follower counts from the browser.
 */
export default function FanbaseField({ value, onChange }) {
  const items = value ?? [];
  const usedPlatforms = new Set(items.map((it) => it.platform));
  const availablePlatforms = FANBASE_PLATFORMS.filter((p) => !usedPlatforms.has(p.platform));

  function update(index, field, val) {
    onChange(items.map((it, i) => (i === index ? { ...it, [field]: val } : it)));
  }
  function remove(index) {
    onChange(items.filter((_, i) => i !== index));
  }
  function add() {
    const next = availablePlatforms[0];
    if (!next) return;
    onChange([...items, { platform: next.platform, number: '', label: next.defaultLabel }]);
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Fanbase (manual - e.g. "86.6M" for Spotify monthly listeners)
      </p>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={item.platform}
              onChange={(e) => {
                const preset = FANBASE_PLATFORMS.find((p) => p.platform === e.target.value);
                update(i, 'platform', e.target.value);
                if (preset && !item.label) update(i, 'label', preset.defaultLabel);
              }}
              className="h-8 w-32 shrink-0 rounded-[2px] border border-input bg-transparent px-2 text-sm text-foreground outline-none"
            >
              <option value={item.platform}>{item.platform}</option>
              {availablePlatforms.map((p) => (
                <option key={p.platform} value={p.platform}>
                  {p.platform}
                </option>
              ))}
            </select>
            <Input value={item.number} onChange={(e) => update(i, 'number', e.target.value)} placeholder="86.6M" className="w-28" />
            <Input value={item.label} onChange={(e) => update(i, 'label', e.target.value)} placeholder="Monthly Listeners" />
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="shrink-0 hover:text-destructive" aria-label="Remove">
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      {availablePlatforms.length > 0 && (
        <Button type="button" variant="outline" onClick={add} className="mt-3 gap-1.5">
          <Plus className="size-4" /> Add platform
        </Button>
      )}
    </div>
  );
}
