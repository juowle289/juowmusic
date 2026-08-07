import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function Comments() {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('cmts') || '[]');
    setComments(saved);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const next = [...comments, trimmed];
    setComments(next);
    localStorage.setItem('cmts', JSON.stringify(next));
    setText('');
  };

  return (
    <section id="cmt" className="comments scroll-mt-24 border-b-[0.3em] border-[#a00000] px-4 py-12 sm:px-8 md:w-3/5 md:px-0">
      <h2 className="section-heading mb-8 text-black">Comments</h2>

      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-3">
          {comments.length === 0 && (
            <p className="text-center text-sm text-black/50">Be the first to leave a comment.</p>
          )}
          {comments.map((comment, index) => (
            <div
              key={index}
              className="rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-black shadow-sm"
            >
              {comment}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your comment ..."
            rows={3}
            className="min-h-24 flex-1 border-black/15 bg-white text-black placeholder:text-black/40"
          />
          <Button
            type="submit"
            size="icon-lg"
            className="shrink-0 self-end bg-black text-juow-soft hover:bg-black/80"
            aria-label="Submit comment"
          >
            <Send className="size-5" />
          </Button>
        </form>
      </div>
    </section>
  );
}
