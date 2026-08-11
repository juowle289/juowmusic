import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio } from 'lucide-react';
import useActiveParties from '@/hooks/useActiveParties';
import { handleImageError } from '@/lib/imageFallback';
import { cn } from '@/lib/utils';

const LOGO_SRC = 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/logo-J.png';

/**
 * A single floating glass bubble for one live party. Bobs gently up/down on
 * its own cycle (see .party-bubble in index.css) instead of the whole row
 * moving in lockstep, and pauses that motion on hover/focus so the reveal
 * card underneath doesn't get read while it's drifting. Clicking drops the
 * person straight into that room as a guest, same as opening an invite
 * link (see PartyPage / usePartySync).
 */
function PartyBubble({ party, index }) {
  const navigate = useNavigate();
  const [active, setActive] = useState(false);

  // Deterministic per-bubble variation (not Math.random on every render) -
  // just enough spread that a row of bubbles reads as loose and organic
  // rather than a perfectly synchronized grid.
  const bobDuration = 3.2 + (index % 5) * 0.35;
  const bobDelay = -((index % 7) * 0.55);

  const hostName = party.hostName || 'Host';
  const songTitle = party.song?.songTitle || 'Something';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => navigate(`/party/${party.id}`)}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        style={{
          background: 'radial-gradient(circle at 32% 26%, rgba(255,255,255,0.95), rgba(254,236,147,0.22) 38%, rgba(10,10,10,0.92) 80%)',
          boxShadow:
            'inset 0 2px 6px rgba(255,255,255,0.4), inset 0 -8px 12px rgba(0,0,0,0.55), 0 8px 18px rgba(0,0,0,0.55)',
          '--bob-duration': `${bobDuration}s`,
          '--bob-delay': `${bobDelay}s`,
        }}
        className="party-bubble group relative flex size-16 shrink-0 items-center justify-center rounded-full border border-white/25 p-3 outline-none transition-transform duration-300 hover:scale-110 focus-visible:scale-110 focus-visible:ring-2 focus-visible:ring-juow-accent"
        aria-label={`Join ${hostName}'s listening party — now playing ${songTitle}`}
      >
        {/* Small specular highlight - the "glass" sheen the borrowed
            gradient above can't fake on its own. */}
        <span className="pointer-events-none absolute left-[22%] top-[16%] size-2.5 rounded-full bg-white/80 blur-[1px]" aria-hidden />
        <img src={LOGO_SRC} alt="" className="size-7 object-contain" onError={handleImageError} />
      </button>

      <div
        className={cn(
          'pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-36 -translate-x-1/2 rounded-md border border-white/10 bg-[#111] px-2.5 py-2 text-center text-xs shadow-xl transition-all duration-200',
          active ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0',
        )}
      >
        <p className="truncate font-medium text-juow-accent">{hostName}</p>
        <p className="mt-0.5 truncate text-white/60">{songTitle}</p>
      </div>
    </div>
  );
}

/**
 * Live-parties rail shown under the "You may also like" list on LyricPage.
 * Each bubble is a standing invite: tap one to join that room and start
 * hearing whatever the host is playing, in sync (see usePartySync). Only
 * renders parties usePartySync's heartbeat has heard from in the last 30s
 * (see useActiveParties), so a room never lingers here after its host has
 * actually left.
 */
export default function PartyBubbles() {
  const parties = useActiveParties();

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-white/10 bg-black p-5">
      <div className="flex items-center gap-2 text-white">
        <Radio className="size-4 text-juow-accent" />
        <h3 className="font-[family-name:var(--font-anton)] text-lg">Listening Party</h3>
      </div>
      <p className="mt-1.5 text-sm text-white/50">
        Live rooms right now — tap one to drop in and hear the same song, at the same moment, as everyone inside.
      </p>

      {parties.length === 0 ? (
        <p className="mt-6 text-center text-sm text-white/35">
          Nothing live at the moment — start one from the radio icon on the player.
        </p>
      ) : (
        <div className="mt-7 flex flex-wrap items-start justify-center gap-5 pb-2">
          {parties.map((party, i) => (
            <PartyBubble key={party.id} party={party} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
