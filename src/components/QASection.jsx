import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function QASection({ items }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section id="qa" className="QapsA scroll-mt-24 border-b-[0.3em] border-[#a00000] px-4 py-12 sm:px-8 md:w-3/5 md:px-0">
      <h2 className="section-heading mb-8 text-black">Q&amp;A</h2>

      <div className="mx-auto max-w-3xl space-y-3">
        {items.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={index} className="overflow-hidden rounded-xl border border-black/10">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className={cn(
                  'flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors',
                  isOpen ? 'bg-black text-juow-soft' : 'bg-white text-black hover:bg-black/5',
                )}
              >
                <span className="font-medium">{item.question}</span>
                <ChevronDown className={cn('size-5 shrink-0 transition-transform', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <div
                  className="border-t border-black/10 bg-white px-4 py-4 text-black [&_p]:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: item.answerHtml }}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
