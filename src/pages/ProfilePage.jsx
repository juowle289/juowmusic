import { useEffect, useMemo, useState } from 'react';
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
  Flame,
  Headphones,
  Eye,
  EyeOff,
  CheckCircle2,
  LayoutDashboard,
  Settings as SettingsIcon,
  Languages,
  Palette,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import SiteFooter from '@/components/SiteFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { playableTracks } from '@/data/playableTracks';
import { handleImageError } from '@/lib/imageFallback';

const ACCENT = '#feec93';
const TIME_SLOT_COLORS = ['#feec93', '#e0b84d', '#a0783a', '#4b3a2a'];

/** Small deterministic PRNG so the mock listening stats stay stable across
 * re-renders/reloads for a given username, instead of jumping around every
 * time React re-renders (Math.random() on every render would look broken). */
function seededRandom(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildListeningStats(seed) {
  const rand = seededRandom(seed || 'juowle');

  const topSongs = [...playableTracks]
    .map((track) => ({ ...track, plays: Math.round(20 + rand() * 180) }))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 5);

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return {
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      minutes: Math.round(8 + rand() * 55),
    };
  });

  const timeOfDay = [
    { name: 'Morning', value: Math.round(10 + rand() * 20) },
    { name: 'Afternoon', value: Math.round(20 + rand() * 30) },
    { name: 'Evening', value: Math.round(25 + rand() * 35) },
    { name: 'Night', value: Math.round(10 + rand() * 20) },
  ];

  const totalPlays = topSongs.reduce((sum, s) => sum + s.plays, 0) + Math.round(rand() * 400);
  const totalMinutes = days.reduce((sum, d) => sum + d.minutes, 0) * 3;
  const streakDays = Math.round(3 + rand() * 18);
  const favoriteArtist = topSongs[0]?.artistName ?? '—';

  return { topSongs, days, timeOfDay, totalPlays, totalMinutes, streakDays, favoriteArtist };
}

/** Animates from 0 up to `target` once on mount, easing out - like a slot
 * machine reel settling on its final number - instead of the number just
 * appearing. Purely cosmetic: `target` itself is already the real value. */
function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const from = 0;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3; // easeOutCubic
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
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

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
        active ? 'border-juow-accent text-juow-accent' : 'border-transparent text-juow-soft/60 hover:text-juow-soft',
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

/** Purely visual option-picker for the Preferences preview - selection lives
 * in local state only and does not change the app's actual language/theme. */
function SegmentedControl({ value, onChange, options }) {
  return (
    <div className="inline-flex flex-wrap gap-2">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
              active
                ? 'border-juow-accent bg-juow-accent text-black'
                : 'border-white/15 text-juow-soft/70 hover:border-juow-accent/50 hover:text-juow-soft',
            )}
          >
            {Icon && <Icon className="size-3.5" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ProfilePage() {
  const { user, initializing, reauthenticate, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'settings' ? 'settings' : 'overview';
  const displayName = user?.displayName || user?.email;
  const stats = useMemo(() => buildListeningStats(displayName), [displayName]);

  const [username, setUsername] = useState(user?.displayName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', message }
  const [submitting, setSubmitting] = useState(false);
  const [language, setLanguage] = useState('en');
  const [themeMode, setThemeMode] = useState('dark');

  // Wait for Firebase to resolve the session on first load - otherwise a
  // logged-in user gets bounced to /login for a frame on every refresh.
  if (initializing) return null;
  if (!user) return <Navigate to="/login" replace />;

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);
    try {
      // Firebase requires a recent login before it will let the account
      // change email or password, so re-confirm identity first.
      await reauthenticate(currentPassword);
      await updateUserProfile({ username, email, newPassword: newPassword || undefined });
      setCurrentPassword('');
      setNewPassword('');
      setStatus({ type: 'success', message: 'Profile updated!' });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-28">
      <header className="border-b border-white/10 px-4 pb-8 pt-24 sm:px-8 md:px-16">
        <button
          type="button"
          onClick={goBack}
          className="mb-6 flex items-center gap-1.5 text-sm text-juow-soft/60 transition-colors hover:text-juow-accent"
        >
          <ArrowLeft className="size-4" /> Back
        </button>

        <p className="text-sm uppercase tracking-widest text-juow-accent">Account</p>
        <h1 className="font-[family-name:var(--font-anton)] text-4xl md:text-5xl">Hi, {displayName}</h1>
        <p className="mt-2 text-juow-soft/60">Manage your account and see how you&apos;ve been listening.</p>

        <nav className="mt-8 flex gap-6 border-b border-white/10">
          <TabButton active={tab === 'overview'} onClick={() => setSearchParams({})} icon={LayoutDashboard}>
            Overview
          </TabButton>
          <TabButton active={tab === 'settings'} onClick={() => setSearchParams({ tab: 'settings' })} icon={SettingsIcon}>
            Settings
          </TabButton>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8 md:px-16">
        {tab === 'overview' ? (
          <motion.section key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <h2 className="section-heading text-left text-3xl md:text-[2.4em]">Listening Stats</h2>

            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={Headphones} label="Total plays" countTo={stats.totalPlays} sub="last 30 days" />
              <StatCard
                icon={Clock}
                label="Time listened"
                countTo={Math.round(stats.totalMinutes / 60)}
                formatValue={(v) => `${v}h`}
                sub={`${stats.totalMinutes} min`}
                delay={0.08}
              />
              <StatCard icon={Flame} label="Current streak" countTo={stats.streakDays} formatValue={(v) => `${v} days`} sub="in a row" delay={0.16} />
              <StatCard icon={Music4} label="Favorite artist" staticValue={stats.favoriteArtist} delay={0.24} />
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
          </motion.section>
        ) : (
          <motion.section key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <h2 className="section-heading text-left text-3xl md:text-[2.4em]">Account Settings</h2>

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
                  className="h-11 border-white/20 bg-white/5 text-juow-soft"
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
                  className="h-11 border-white/20 bg-white/5 text-juow-soft"
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
                    className="h-11 border-white/20 bg-white/5 pr-10 text-juow-soft"
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
                  className="h-11 border-white/20 bg-white/5 text-juow-soft"
                />
              </div>

              {status && (
                <p className={cn('flex items-center gap-2 text-sm', status.type === 'success' ? 'text-green-400' : 'text-red-400')}>
                  {status.type === 'success' && <CheckCircle2 className="size-4" />}
                  {status.message}
                </p>
              )}

              <Button type="submit" disabled={submitting} className="h-11 bg-juow-accent text-black hover:bg-juow-accent/90 disabled:opacity-60">
                {submitting ? 'Saving…' : 'Save changes'}
              </Button>
            </form>

            <div className="mt-12 max-w-lg border-t border-white/10 pt-8">
              <div className="mb-4 flex items-center gap-2">
                <h3 className="font-[family-name:var(--font-anton)] text-xl text-juow-soft">Preferences</h3>
                <span className="rounded-full border border-juow-accent/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-juow-accent">
                  Preview
                </span>
              </div>
              <p className="mb-5 text-sm text-juow-soft/50">
                Chọn trước giao diện bạn thích — tính năng đang được hoàn thiện và chưa được áp dụng thực tế.
              </p>

              <div className="space-y-5">
                <div>
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium text-juow-soft/80">
                    <Languages className="size-4" /> Language
                  </p>
                  <SegmentedControl
                    value={language}
                    onChange={setLanguage}
                    options={[
                      { value: 'en', label: 'English' },
                      { value: 'vi', label: 'Tiếng Việt' },
                    ]}
                  />
                </div>

                <div>
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium text-juow-soft/80">
                    <Palette className="size-4" /> Theme
                  </p>
                  <SegmentedControl
                    value={themeMode}
                    onChange={setThemeMode}
                    options={[
                      { value: 'light', label: 'Light', icon: Sun },
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'system', label: 'Default', icon: Monitor },
                    ]}
                  />
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </main>

      <SiteFooter dark />
    </div>
  );
}
