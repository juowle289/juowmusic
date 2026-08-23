import { useMemo, useState } from 'react';
import { Navigate, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Music4,
  Clock,
  Headphones,
  Eye,
  EyeOff,
  CheckCircle2,
  LayoutDashboard,
  Settings as SettingsIcon,
  Palette,
  ScrollText,
} from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import ListeningWeather from '@/components/ListeningWeather';
import MusicLoader from '@/components/MusicLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/components/ThemeProvider';
import { useUiHints } from '@/context/UiHintsContext';
import { logActivity } from '@/utils/activityLog';
import { syncCommentAuthorName } from '@/utils/syncCommentAuthorName';
import ActivityLogPanel from '@/components/ActivityLogPanel';
import { tracksBySlug } from '@/data/playableTracks';
import useListeningHistory from '@/hooks/useListeningHistory';
import useCountUp from '@/hooks/useCountUp';
import StreakCard from '@/components/StreakCard';
import { handleImageError } from '@/lib/imageFallback';

const ACCENT = '#feec93';
const TIME_SLOT_COLORS = ['#feec93', '#e0b84d', '#a0783a', '#4b3a2a'];
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(timestamp) {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function timeOfDayBucket(hour) {
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
}

/** Turns the real listening history (see listeningHistory.js /
 * useListeningTracker, synced from Firestore by useListeningHistory) into
 * everything the Overview tab shows. A brand new account with no plays yet
 * gets honest zeroes, not filler numbers. */
function buildRealStats(history) {
  const plays = history.filter((e) => e.type === 'play');
  const listens = history.filter((e) => e.type === 'listen');

  const topSongs = (() => {
    const countBySlug = new Map();
    for (const p of plays) countBySlug.set(p.slug, (countBySlug.get(p.slug) ?? 0) + 1);
    return [...countBySlug.entries()]
      .map(([slug, count]) => {
        const track = tracksBySlug[slug];
        return track ? { ...track, plays: count } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 5);
  })();

  const days = Array.from({ length: 14 }, (_, i) => {
    const dayStart = startOfDay(Date.now()) - (13 - i) * DAY_MS;
    const dayEnd = dayStart + DAY_MS;
    const minutes = Math.round(
      listens.filter((e) => e.timestamp >= dayStart && e.timestamp < dayEnd).reduce((sum, e) => sum + e.seconds, 0) /
        60,
    );
    return { label: new Date(dayStart).toLocaleDateString('en-US', { weekday: 'short' }), minutes };
  });

  const timeOfDayCounts = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
  for (const p of plays) timeOfDayCounts[timeOfDayBucket(new Date(p.timestamp).getHours())]++;
  const timeOfDay = Object.entries(timeOfDayCounts).map(([name, value]) => ({ name, value }));

  const totalPlays = plays.length;
  const totalMinutes = Math.round(listens.reduce((sum, e) => sum + e.seconds, 0) / 60);

  const artistCounts = new Map();
  for (const p of plays) {
    if (!p.artistName) continue;
    artistCounts.set(p.artistName, (artistCounts.get(p.artistName) ?? 0) + 1);
  }
  let favoriteArtist = '—';
  let bestCount = 0;
  for (const [artist, count] of artistCounts) {
    if (count > bestCount) {
      bestCount = count;
      favoriteArtist = artist;
    }
  }

  // Consecutive days (including today) with at least one play, walking
  // backward from today - a single missed day breaks the chain. This
  // naturally excludes "today" until it's actually been played (see
  // streakInsights below for the friendlier "you can still extend it"
  // framing while today's still in progress).
  const activeDays = new Set(plays.map((p) => startOfDay(p.timestamp)));
  let streakDays = 0;
  let cursor = startOfDay(Date.now());
  while (activeDays.has(cursor)) {
    streakDays++;
    cursor -= DAY_MS;
  }

  const streakInsights = buildStreakInsights(activeDays, timeOfDay);

  return { topSongs, days, timeOfDay, totalPlays, totalMinutes, streakDays, favoriteArtist, streakInsights };
}

/** No-punishment streak framing: whether today's still open to play (streak
 * isn't actually broken until the day fully passes), and - if a streak
 * genuinely did lapse - the best one they've ever had, so a broken streak
 * reads as "here's what you've done before", not just a reset to zero. */
function buildStreakInsights(activeDays, timeOfDay) {
  const today = startOfDay(Date.now());
  const yesterday = today - DAY_MS;

  const hasPlayedToday = activeDays.has(today);
  const yesterdayActive = activeDays.has(yesterday);

  let bestStreak = 0;
  for (const day of activeDays) {
    if (activeDays.has(day - DAY_MS)) continue; // not the start of a run
    let len = 0;
    let cursor = day;
    while (activeDays.has(cursor)) {
      len++;
      cursor += DAY_MS;
    }
    bestStreak = Math.max(bestStreak, len);
  }

  const favoriteBucket = [...timeOfDay].sort((a, b) => b.value - a.value)[0];
  const favoriteBucketName = favoriteBucket && favoriteBucket.value > 0 ? favoriteBucket.name : null;

  return { hasPlayedToday, yesterdayActive, bestStreak, favoriteBucketName };
}

function StatCard({ icon: Icon, label, countTo, formatValue, staticValue, sub, delay = 0 }) {
  const animated = useCountUp(countTo ?? 0);
  const display = staticValue ?? (formatValue ? formatValue(animated) : animated.toLocaleString());

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-lg border border-white/10 bg-white/5 p-5"
    >
      <div className="flex items-center gap-2 text-juow-accent">
        <Icon className="size-5" />
        <span className="text-sm text-juow-soft/70">{label}</span>
      </div>
      <p className="mt-2 font-[family-name:var(--font-anton)] text-3xl tabular-nums">{display}</p>
      {sub && <p className="mt-1 text-sm text-juow-soft/50">{sub}</p>}
    </motion.div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-5">
      <h3 className="mb-4 font-[family-name:var(--font-anton)] text-lg text-juow-soft">{title}</h3>
      {children}
    </div>
  );
}

function SidebarTabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 border-l-2 px-4 py-3 text-left text-sm font-medium whitespace-nowrap transition-colors',
        active ? 'border-juow-accent bg-white/5 text-juow-accent' : 'border-transparent text-juow-soft/60 hover:bg-white/5 hover:text-juow-soft',
      )}
    >
      <Icon className="size-4 shrink-0" />
      {children}
    </button>
  );
}

export default function ProfilePage() {
  const { user, initializing, updateUserProfile, reauthenticate } = useAuth();
  const navigate = useNavigate();
  const { t, lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { hintsEnabled, setHintsEnabled } = useUiHints();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab = tabParam === 'settings' ? 'settings' : tabParam === 'activity' ? 'activity' : 'overview';
  const [settingsTab, setSettingsTab] = useState('account'); // 'account' | 'appearance'
  const displayName = user?.displayName || user?.email || 'juowle';
  const { history, loading: historyLoading } = useListeningHistory(user?.uid);
  const stats = useMemo(() => buildRealStats(history), [history]);

  const [username, setUsername] = useState(user?.displayName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', message }

  // Firebase restores the session from IndexedDB on load, which takes a
  // beat - bailing out to /login before that resolves would boot someone
  // who's actually still logged in straight back out. Wait for it first.
  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <MusicLoader />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    if (!currentPassword) {
      setStatus({ type: 'error', message: 'Enter your current password to confirm changes.' });
      return;
    }

    setSaving(true);
    try {
      await reauthenticate(currentPassword);
      const usernameChanged = username.trim() && username.trim() !== (user.displayName ?? '');
      await updateUserProfile({ username, email, newPassword: newPassword || undefined });
      if (usernameChanged) {
        // Fire-and-forget: don't block the "saved" confirmation on this -
        // worst case it finishes a beat later and old comments catch up
        // to the new name shortly after the success message shows.
        syncCommentAuthorName(user.uid, username.trim()).catch((error) => {
          console.error('[juowmusic] Failed to sync new display name onto past comments:', error);
        });
      }
      logActivity(user.uid, { type: 'profile_update', detail: { username, email, passwordChanged: !!newPassword } });
      setCurrentPassword('');
      setNewPassword('');
      setStatus({ type: 'success', message: 'Profile updated!' });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-28">
      <header className="border-b border-white/10 px-4 pt-24 pb-5 sm:px-8 md:px-16 lg:px-0">
        <div className="mx-auto lg:w-4/5 lg:max-w-[1400px]">
          <button
            type="button"
            onClick={goBack}
            className="mb-3 flex items-center gap-1.5 text-sm text-juow-soft/60 transition-colors hover:text-juow-accent"
          >
            <ArrowLeft className="size-4" /> {t('profile.back')}
          </button>

          <p className="text-xs uppercase tracking-widest text-juow-accent">Account</p>
          <h1 className="font-[family-name:var(--font-anton)] text-3xl md:text-4xl">Hi, {displayName}</h1>
          <p className="mt-1 text-sm text-juow-soft/60">Manage your account and see how you&apos;ve been listening.</p>
        </div>
      </header>

      <main className="mx-auto px-4 py-10 sm:px-8 md:px-16 lg:w-4/5 lg:max-w-[1400px] lg:px-0">
        <div className="flex flex-col gap-8 md:flex-row">
          <nav className="flex shrink-0 divide-x divide-white/10 border border-white/10 md:w-48 md:flex-col md:divide-x-0 md:divide-y">
            <SidebarTabButton active={tab === 'overview'} onClick={() => setSearchParams({}, { replace: true })} icon={LayoutDashboard}>
              {t('profile.tab.overview')}
            </SidebarTabButton>
            <SidebarTabButton active={tab === 'settings'} onClick={() => setSearchParams({ tab: 'settings' }, { replace: true })} icon={SettingsIcon}>
              {t('profile.tab.settings')}
            </SidebarTabButton>
            <SidebarTabButton active={tab === 'activity'} onClick={() => setSearchParams({ tab: 'activity' }, { replace: true })} icon={ScrollText}>
              {t('settings.tab.activity')}
            </SidebarTabButton>
          </nav>

          {tab === 'settings' && (
            <nav className="flex shrink-0 divide-x divide-white/10 border border-white/10 md:w-44 md:flex-col md:divide-x-0 md:divide-y">
              <SidebarTabButton active={settingsTab === 'account'} onClick={() => setSettingsTab('account')} icon={SettingsIcon}>
                {t('settings.tab.account')}
              </SidebarTabButton>
              <SidebarTabButton active={settingsTab === 'appearance'} onClick={() => setSettingsTab('appearance')} icon={Palette}>
                {t('settings.tab.appearance')}
              </SidebarTabButton>
            </nav>
          )}

          <div className="min-w-0 flex-1">
        {tab === 'overview' && (
          <motion.section key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <h2 className="section-heading text-left text-3xl md:text-[2.4em]">Listening Stats</h2>

            {historyLoading ? (
              <div className="mt-10 flex justify-center">
                <MusicLoader />
              </div>
            ) : (
              <>
            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-start">
              <div className="grid grid-cols-2 gap-4">
                <StatCard icon={Headphones} label="Total plays" countTo={stats.totalPlays} sub="all time" />
                <StatCard
                  icon={Clock}
                  label="Time listened"
                  countTo={Math.round(stats.totalMinutes / 60)}
                  formatValue={(v) => `${v}h`}
                  sub={`${stats.totalMinutes} min`}
                  delay={0.08}
                />
                <StreakCard streakDays={stats.streakDays} insights={stats.streakInsights} delay={0.16} />
                <StatCard icon={Music4} label="Favorite artist" staticValue={stats.favoriteArtist} delay={0.24} />
              </div>

              <ListeningWeather topSongs={stats.topSongs} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <ChartCard title="Top 5 most played songs">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.topSongs} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="songTitle"
                      width={140}
                      tick={{ fill: '#f5f5fc', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(254,236,147,0.08)' }}
                      contentStyle={{ background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                      labelStyle={{ color: ACCENT }}
                    />
                    <Bar dataKey="plays" fill={ACCENT} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Listening activity (last 14 days)">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={stats.days} margin={{ left: -20, right: 8 }}>
                    <defs>
                      <linearGradient id="minutesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ACCENT} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#f5f5fc', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#f5f5fc', fontSize: 12 }} tickLine={false} axisLine={false} width={30} />
                    <Tooltip
                      contentStyle={{ background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                      labelStyle={{ color: ACCENT }}
                      formatter={(value) => [`${value} min`, 'Listened']}
                    />
                    <Area type="monotone" dataKey="minutes" stroke={ACCENT} strokeWidth={2} fill="url(#minutesFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="When you listen most">
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="60%" height={220}>
                    <PieChart>
                      <Pie
                        data={stats.timeOfDay}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {stats.timeOfDay.map((entry, i) => (
                          <Cell key={entry.name} fill={TIME_SLOT_COLORS[i % TIME_SLOT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="space-y-2 text-sm">
                    {stats.timeOfDay.map((slot, i) => (
                      <li key={slot.name} className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ background: TIME_SLOT_COLORS[i % TIME_SLOT_COLORS.length] }} />
                        <span className="text-juow-soft/80">{slot.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </ChartCard>

              <ChartCard title="Recently played">
                <ul className="divide-y divide-white/10">
                  {stats.topSongs.slice(0, 4).map((song) => (
                    <li key={song.slug}>
                      <Link
                        to={`/lyrics/${song.slug}`}
                        className="flex items-center gap-3 py-2.5 transition-colors hover:text-juow-accent"
                      >
                        <img src={song.coverSrc} alt="" className="size-10 shrink-0 rounded object-cover" onError={handleImageError} />
                        <div className="min-w-0">
                          <p className="truncate">{song.songTitle}</p>
                          <p className="truncate text-sm text-juow-soft/50">{song.artistName}</p>
                        </div>
                        <span className="ml-auto shrink-0 text-sm text-juow-soft/50">{song.plays} plays</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </ChartCard>
            </div>
              </>
            )}
          </motion.section>
        )}

        {tab === 'settings' && (
          <motion.section key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {settingsTab === 'account' && (
              <>
                <h2 className="section-heading mt-6 text-left text-3xl md:text-[2.4em]">Account Settings</h2>

                <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="pf-username" className="text-sm font-medium text-juow-soft/80">
                      Username
                    </label>
                    <Input
                      id="pf-username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="h-11 rounded-none border-white/20 bg-white/5 text-juow-soft"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="pf-email" className="text-sm font-medium text-juow-soft/80">
                      Email
                    </label>
                    <Input
                      id="pf-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 rounded-none border-white/20 bg-white/5 text-juow-soft"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="pf-current-password" className="text-sm font-medium text-juow-soft/80">
                      Current password<span className="text-red-400"> *</span>
                    </label>
                    <div className="relative">
                      <Input
                        id="pf-current-password"
                        type={showPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        placeholder="Needed to confirm any change"
                        className="h-11 rounded-none border-white/20 bg-white/5 pr-10 text-juow-soft"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-juow-soft/50 hover:text-juow-soft"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="pf-new-password" className="text-sm font-medium text-juow-soft/80">
                      New password <span className="text-juow-soft/40">(optional)</span>
                    </label>
                    <Input
                      id="pf-new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Leave blank to keep your current password"
                      className="h-11 rounded-none border-white/20 bg-white/5 text-juow-soft"
                    />
                  </div>

                  {status && (
                    <p className={cn('flex items-center gap-2 text-sm', status.type === 'success' ? 'text-green-400' : 'text-red-400')}>
                      {status.type === 'success' && <CheckCircle2 className="size-4" />}
                      {status.message}
                    </p>
                  )}

                  <Button type="submit" disabled={saving} className="h-11 rounded-none bg-juow-accent text-black hover:bg-juow-accent/90 disabled:opacity-60">
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                </form>
              </>
            )}

            {settingsTab === 'appearance' && (
              <div className="mt-6 max-w-lg">
                <h2 className="section-heading text-left text-3xl md:text-[2.4em]">{t('settings.appearance.heading')}</h2>

                <div className="mt-6 space-y-6">
                  <div>
                    <p className="text-sm font-medium text-juow-soft/80">{t('settings.appearance.language')}</p>
                    <div className="mt-2 inline-flex overflow-hidden rounded-lg border border-white/15">
                      <button
                        type="button"
                        onClick={() => setLang('en')}
                        className={cn('px-4 py-2 text-sm font-medium transition-colors', lang === 'en' ? 'bg-juow-accent text-black' : 'text-juow-soft/60 hover:text-juow-soft')}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        onClick={() => setLang('vi')}
                        className={cn('px-4 py-2 text-sm font-medium transition-colors', lang === 'vi' ? 'bg-juow-accent text-black' : 'text-juow-soft/60 hover:text-juow-soft')}
                      >
                        Tiếng Việt
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-juow-soft/80">{t('settings.appearance.theme')}</p>
                    <div className="mt-2 inline-flex overflow-hidden rounded-lg border border-white/15">
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={cn('px-4 py-2 text-sm font-medium transition-colors', theme === 'light' ? 'bg-juow-accent text-black' : 'text-juow-soft/60 hover:text-juow-soft')}
                      >
                        {t('settings.appearance.theme.light')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={cn('px-4 py-2 text-sm font-medium transition-colors', theme === 'dark' ? 'bg-juow-accent text-black' : 'text-juow-soft/60 hover:text-juow-soft')}
                      >
                        {t('settings.appearance.theme.dark')}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-juow-soft/80">Tips &amp; hints</p>
                    <p className="mt-1 text-xs text-juow-soft/40">
                      Faint on-screen labels pointing out things like selecting lyrics to share, or shrinking the
                      player into a draggable record.
                    </p>
                    <button
                      type="button"
                      onClick={() => setHintsEnabled(!hintsEnabled)}
                      role="switch"
                      aria-checked={hintsEnabled}
                      className={cn(
                        'relative mt-2 h-6 w-11 shrink-0 rounded-full transition-colors',
                        hintsEnabled ? 'bg-juow-accent' : 'bg-white/15',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 size-5 rounded-full bg-black transition-transform',
                          hintsEnabled ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
                        )}
                      />
                    </button>
                  </div>

                  <p className="text-xs text-juow-soft/40">{t('settings.appearance.scopeNote')}</p>
                </div>
              </div>
            )}
          </motion.section>
        )}

        {tab === 'activity' && (
          <motion.section key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <ActivityLogPanel user={user} reauthenticate={reauthenticate} />
          </motion.section>
        )}
          </div>
        </div>
      </main>

      <SiteFooter dark />
    </div>
  );
}
