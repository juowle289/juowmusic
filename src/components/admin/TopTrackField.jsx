import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import FileUploadField from '@/components/admin/FileUploadField';

const EMPTY_TRACK = { title: '', img: '', aboutText: '', achievements: [] };

/** The artist page's "Top Tracks" card: one highlighted song with a short
 * write-up and a few achievement stats (e.g. "1.2B" / "Streams"). */
export default function TopTrackField({ value, onChange }) {
  const track = value ?? EMPTY_TRACK;
  const achievements = track.achievements ?? [];

  function set(field, val) {
    onChange({ ...track, [field]: val });
  }
  function updateAchievement(index, field, val) {
    set(
      'achievements',
      achievements.map((a, i) => (i === index ? { ...a, [field]: val } : a)),
    );
  }
  function removeAchievement(index) {
    set('achievements', achievements.filter((_, i) => i !== index));
  }
  function addAchievement() {
    set('achievements', [...achievements, { number: '', label: '' }]);
  }

  return (
    <div className="space-y-4">
      <Input value={track.title} onChange={(e) => set('title', e.target.value)} placeholder="Track title" />
      <FileUploadField label="Cover art" kind="image" value={track.img} onChange={(v) => set('img', v)} folder="artists/top-track" />
      <Textarea value={track.aboutText} onChange={(e) => set('aboutText', e.target.value)} rows={4} placeholder="A short write-up about the track" />

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Achievements (e.g. "1.2B" / "Streams")</p>
        <div className="space-y-2">
          {achievements.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={a.number} onChange={(e) => updateAchievement(i, 'number', e.target.value)} placeholder="1.2B" className="w-28" />
              <Input value={a.label} onChange={(e) => updateAchievement(i, 'label', e.target.value)} placeholder="Streams" />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeAchievement(i)} className="shrink-0 hover:text-destructive" aria-label="Remove">
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" onClick={addAchievement} className="mt-3 gap-1.5">
          <Plus className="size-4" /> Add achievement
        </Button>
      </div>
    </div>
  );
}
