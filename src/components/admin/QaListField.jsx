import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

/**
 * Add/edit/remove a list of {question, answer} pairs - backs the song
 * lyric page's Q&A section and the artist page's Artist FAQ section (same
 * shape, just two different render spots on the public site).
 */
export default function QaListField({ label, value, onChange }) {
  const items = value ?? [];

  function update(index, field, text) {
    const next = items.map((it, i) => (i === index ? { ...it, [field]: text } : it));
    onChange(next);
  }

  function remove(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...items, { question: '', answer: '' }]);
  }

  return (
    <div>
      {label && <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>}

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-start gap-2">
              <Input
                value={item.question}
                onChange={(e) => update(i, 'question', e.target.value)}
                placeholder="Question"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(i)}
                className="shrink-0 hover:text-destructive"
                aria-label="Remove"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Textarea
              value={item.answer}
              onChange={(e) => update(i, 'answer', e.target.value)}
              placeholder="Answer"
              rows={2}
            />
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={add} className="mt-3 gap-1.5">
        <Plus className="size-4" /> Add question
      </Button>
    </div>
  );
}
