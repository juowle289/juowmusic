import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import useActiveParties from '@/hooks/useActiveParties';
import { handleImageError } from '@/lib/imageFallback';
import { cn } from '@/lib/utils';

const LOGO_SRC = 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/logo-juowmusic.png';

// Hand-placed cluster positions (percent of container width/height + px
// diameter) instead of a grid - loosely overlapping, uneven sizes, the way
// a pile of glass marbles actually settles rather than lining up in neat
// rows. Cycles if there are ever more live parties than slots.
const CLUSTER_LAYOUT = [
  { x: 16, y: 22, size: 74 },
  { x: 46, y: 10, size: 54 },
  { x: 72, y: 20, size: 66 },
  { x: 30, y: 46, size: 92 },
  { x: 60, y: 48, size: 48 },
  { x: 85, y: 44, size: 58 },
  { x: 10, y: 70, size: 52 },
  { x: 40, y: 76, size: 80 },
  { x: 68, y: 72, size: 46 },
  { x: 90, y: 76, size: 54 },
];
const CLUSTER_HEIGHT = 230;

/**
 * A single floating glass bubble for one live party, hand-placed within
 * the cluster (see CLUSTER_LAYOUT) rather than laid out in a flex grid -
 * overlapping, uneven sizes, closer to a pile of marbles than a row of
 * icons. Bobs gently up/down on its own cycle (see .party-bubble in
 * index.css) and pauses that motion on hover/focus so the reveal card
 * underneath doesn't get read while it's drifting. Clicking drops the
 * person straight into that room as a guest, same as opening an invite
 * link (see PartyPage / usePartySync).
 */
function PartyBubble({ party, index }) {
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const slot = CLUSTER_LAYOUT[index % CLUSTER_LAYOUT.length];

  // Deterministic per-bubble variation (not Math.random on every render) -
  // just enough spread that the cluster reads as loose and organic rather
  // than perfectly synchronized.
  const bobDuration = 3.2 + (index % 5) * 0.35;
  const bobDelay = -((index % 7) * 0.55);

  const hostName = party.hostName || 'Host';
  const songTitle = party.song?.songTitle || 'Something';

  return (
    <div
      className="absolute"
      style={{ left: `${slot.x}%`, top: `${slot.y}%`, zIndex: active ? 40 : index + 1 }}
    >
      <button
        type="button"
        onClick={() => navigate(`/party/${party.id}`)}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        style={{
          width: slot.size,
          height: slot.size,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle at 32% 26%, rgba(255,255,255,0.95), rgba(254,236,147,0.22) 38%, rgba(10,10,10,0.92) 80%)',
          boxShadow:
            'inset 0 2px 6px rgba(255,255,255,0.4), inset 0 -8px 12px rgba(0,0,0,0.55), 0 8px 16px rgba(0,0,0,0.3)',
          '--bob-duration': `${bobDuration}s`,
          '--bob-delay': `${bobDelay}s`,
        }}
        className="party-bubble group relative flex items-center justify-center rounded-full border border-white/25 p-3 outline-none transition-transform duration-300 hover:z-40 hover:scale-110 focus-visible:z-40 focus-visible:scale-110 focus-visible:ring-2 focus-visible:ring-juow-accent"
        aria-label={`Join ${hostName}'s listening party — now playing ${songTitle}`}
      >
        {/* Small specular highlight - the "glass" sheen the borrowed
            gradient above can't fake on its own. */}
        <span className="pointer-events-none absolute left-[22%] top-[16%] size-2.5 rounded-full bg-white/80 blur-[1px]" aria-hidden />
        <img src={LOGO_SRC} alt="" className="size-1/2 object-contain" onError={handleImageError} />
      </button>

      <div
        style={{ transform: 'translate(-50%, -50%)' }}
        className={cn(
          'pointer-events-none absolute left-1/2 top-1/2 z-50 w-36 -translate-x-1/2 rounded-md border border-white/10 bg-[#111] px-2.5 py-2 text-center text-xs text-white shadow-xl transition-all duration-200',
          active ? 'translate-y-[calc(-50%-2.4rem)] opacity-100' : 'translate-y-[calc(-50%-2rem)] opacity-0',
        )}
      >
        <p className="truncate font-medium text-juow-accent">{hostName}</p>
        <p className="mt-0.5 truncate text-white/60">{songTitle}</p>
      </div>
    </div>
  );
}

/**
 * Live-parties cluster shown under the "You may also like" list on
 * LyricPage. Each bubble is a standing invite: tap one to join that room
 * and start hearing whatever the host is playing, in sync (see
 * usePartySync). Only renders parties usePartySync's heartbeat has heard
 * from in the last 30s (see useActiveParties), so a room never lingers
 * here after its host has actually left. Sits directly on the page (no
 * card/background of its own) so it reads as part of the same aside
 * rather than a boxed-off widget.
 */
export default function PartyBubbles() {
  const parties = useActiveParties();

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 text-black">
        <Users className="size-4" />
        <h3 className="font-[family-name:var(--font-anton)] text-lg tracking-wide">Listening Party</h3>
      </div>
      <p className="mt-1.5 text-sm text-black/50">
        Live rooms right now — tap one to drop in and hear the same song, at the same moment, as everyone inside.
      </p>

      {parties.length === 0 ? (
        <p className="mt-6 text-sm text-black/35">
          Nothing live at the moment — start one from the radio icon on the player.
        </p>
      ) : (
        <div className="relative mt-2" style={{ height: CLUSTER_HEIGHT }}>
          {parties.map((party, i) => (
            <PartyBubble key={party.id} party={party} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

