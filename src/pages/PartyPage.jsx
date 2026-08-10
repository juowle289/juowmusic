import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, LogOut, Radio, Send, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { usePartySync } from '@/hooks/usePartySync';
import { isHostOfParty } from '@/lib/party';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { handleImageError } from '@/lib/imageFallback';
import { cn } from '@/lib/utils';

const NICKNAME_KEY = 'juowmusic-party-nickname';

export default function PartyPage() {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const role = isHostOfParty(partyId) ? 'host' : 'guest';
  const [nickname, setNickname] = useState(() => {
    try {
      return localStorage.getItem(NICKNAME_KEY) || '';
    } catch {
      return '';
    }
  });
  const displayName = user?.displayName || user?.email || nickname;
  const [nicknameInput, setNicknameInput] = useState('');

  const { party, messages, sendMessage } = usePartySync(partyId, role, displayName);
  const localSong = usePlayerStore((s) => s.currentSong);
  const localIsPlaying = usePlayerStore((s) => s.isPlaying);

  const song = party?.song ?? (role === 'host' ? localSong : null);
  const isPlaying = role === 'host' ? localIsPlaying : !!party?.isPlaying;

  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);
  const listEndRef = useRef(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const saveNickname = () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) return;
    setNickname(trimmed);
    try {
      localStorage.setItem(NICKNAME_KEY, trimmed);
    } catch {
      // Nickname just won't persist across reloads - not worth blocking on.
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMessage(messageText);
    setMessageText('');
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/party/${partyId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked - the link is in the address bar regardless.
    }
  };

  const needsNickname = !user && !nickname;

  return (
    <div className="min-h-screen bg-black px-4 pb-32 pt-8 text-white sm:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Radio className="size-5 text-juow-accent" />
            <div>
              <h1 className="font-[family-name:var(--font-anton)] text-2xl leading-none">Listening Party</h1>
              <p className="mt-1 text-xs text-white/50">
                {role === 'host' ? "You're hosting — playback here controls everyone." : "Following the host — your player syncs automatically."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={copyLink} variant="outline" className="h-9 gap-1.5 border-white/20 bg-transparent text-xs text-white hover:bg-white/10">
              <Copy className="size-3.5" /> {copied ? 'Copied!' : 'Copy invite link'}
            </Button>
            <Button type="button" onClick={() => navigate('/')} variant="outline" className="h-9 gap-1.5 border-white/20 bg-transparent text-xs text-white hover:bg-white/10">
              <LogOut className="size-3.5" /> Leave
            </Button>
          </div>
        </div>

        {/* Now playing */}
        <div className="mt-6 flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
          {song ? (
            <>
              <img src={song.coverSrc} alt="" className="size-16 shrink-0 rounded object-cover" onError={handleImageError} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{song.songTitle}</p>
                <p className="truncate text-sm text-white/60">{song.artistName}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-white/40">
                  <span className={cn('size-1.5 rounded-full', isPlaying ? 'bg-juow-accent' : 'bg-white/30')} />
                  {isPlaying ? 'Playing' : 'Paused'}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-white/50">
              {role === 'host' ? 'Play a song to start the party.' : 'Waiting for the host to start playing something…'}
            </p>
          )}
        </div>

        {/* Chat */}
        <div className="mt-6 flex h-[50vh] flex-col rounded-lg border border-white/10">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 text-sm text-white/60">
            <Users className="size-4" /> Chat
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && <p className="text-center text-sm text-white/30">No messages yet — say hi.</p>}
            {messages.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="font-medium text-juow-accent">{m.name}: </span>
                <span className="text-white/80">{m.text}</span>
              </div>
            ))}
            <div ref={listEndRef} />
          </div>

          {needsNickname ? (
            <div className="flex items-center gap-2 border-t border-white/10 p-3">
              <Input
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder="Pick a nickname to chat"
                className="h-9 border-white/15 bg-white/5 text-sm text-white placeholder:text-white/30"
              />
              <Button type="button" onClick={saveNickname} className="h-9 bg-juow-accent text-black hover:bg-juow-accent/90">
                Set
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-white/10 p-3">
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Say something…"
                maxLength={500}
                className="h-9 border-white/15 bg-white/5 text-sm text-white placeholder:text-white/30"
              />
              <Button type="submit" disabled={!messageText.trim()} className="h-9 shrink-0 bg-juow-accent text-black hover:bg-juow-accent/90 disabled:opacity-40">
                <Send className="size-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
