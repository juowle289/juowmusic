import { Disc3, Headphones, ListMusic, Mic2, Music2, Radio, Sparkles, Volume2 } from 'lucide-react';

// Satellite icon positions as percentages of the square panel, radiating
// out from the centered brand badge - mirrors the "hub and spoke" diagram
// style of the reference screenshot (dashed lines from a center icon out
// to a ring of feature icons), just re-themed around music instead of AI
// integrations.
const NODES = [
  { Icon: Music2, top: 12, left: 18 },
  { Icon: Radio, top: 6, left: 50 },
  { Icon: Mic2, top: 12, left: 82 },
  { Icon: Disc3, top: 50, left: 9 },
  { Icon: Volume2, top: 50, left: 91 },
  { Icon: ListMusic, top: 88, left: 18 },
  { Icon: Headphones, top: 94, left: 50 },
  { Icon: Sparkles, top: 88, left: 82 },
];

export default function AuthShowcase({ title, subtitle }) {
  return (
    <aside className="relative hidden flex-col items-center justify-center overflow-hidden bg-[#0b0b0c] px-10 py-12 text-white lg:flex">
      {/* Faint dot-grid backdrop, purely decorative */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
        aria-hidden
      />

      <div className="relative z-10 mb-10 max-w-sm text-center">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-white/55">{subtitle}</p>
      </div>

      <div className="relative aspect-square w-full max-w-md">
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
          {NODES.map(({ top, left }, i) => (
            <line
              key={i}
              x1="50"
              y1="50"
              x2={left}
              y2={top}
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="0.4"
              strokeDasharray="2 2.4"
            />
          ))}
        </svg>

        {NODES.map(({ Icon, top, left }, i) => (
          <div
            key={i}
            className="absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-white/10 bg-[#151517] shadow-lg"
            style={{ top: `${top}%`, left: `${left}%` }}
          >
            <Icon className="size-5 text-white/80" />
          </div>
        ))}

        <div className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-black shadow-xl ring-4 ring-juow-accent/20">
          <img src="https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/logo-J.png" alt="" className="size-8" />
        </div>
      </div>
    </aside>
  );
}
