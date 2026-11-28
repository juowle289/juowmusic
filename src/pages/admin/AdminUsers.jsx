import { useEffect, useState } from 'react';
import { Loader2, Search, ShieldBan, ShieldCheck, ShieldPlus, ShieldMinus, Users } from 'lucide-react';
import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import {
  listUsers,
  listUsersFromFirestore,
  setUserDisabled,
  setUserRole,
  setUserRoleViaFirestore,
} from '@/lib/adminUsersApi';
import useDocumentTitle from '@/hooks/useDocumentTitle';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminUsers() {
  useDocumentTitle('Admin · Users');
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [users, setUsers] = useState(null);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyUid, setBusyUid] = useState(null);
  const [error, setError] = useState('');
  // When the server API can't be reached (not deployed, running plain `npm run dev`, or no service-account
  // key) the tab falls back to the Firestore profile mirror instead of showing nothing.
  const [fallbackReason, setFallbackReason] = useState('');

  function load() {
    setError('');
    setFallbackReason('');
    listUsers()
      .then((data) => {
        setUsers(data.users);
        setNextPageToken(data.nextPageToken);
      })
      .catch((apiErr) => {
        listUsersFromFirestore()
          .then((data) => {
            setUsers(data.users);
            setNextPageToken(null);
            setFallbackReason(apiErr.message || 'The users API is unavailable.');
          })
          .catch((err) => setError(err.message || apiErr.message || 'Could not load users.'));
      });
  }
  useEffect(load, []);

  const visibleUsers = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query || !users) return users;
    return users.filter((u) => `${u.displayName ?? ''} ${u.email ?? ''} ${u.uid}`.toLowerCase().includes(query));
  }, [users, q]);

  async function loadMore() {
    if (!nextPageToken) return;
    setLoadingMore(true);
    try {
      const data = await listUsers(nextPageToken);
      setUsers((prev) => [...(prev ?? []), ...data.users]);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setError(err.message || 'Could not load more users.');
    } finally {
      setLoadingMore(false);
    }
  }

  async function toggleAdmin(u) {
    const next = !u.isAdmin;
    if (!window.confirm(`${next ? 'Grant' : 'Revoke'} admin access for ${u.email || u.uid}?`)) return;
    setBusyUid(u.uid);
    try {
      if (fallbackReason) await setUserRoleViaFirestore(u.uid, next, u.email);
      else await setUserRole(u.uid, next, u.email);
      setUsers((prev) => prev.map((x) => (x.uid === u.uid ? { ...x, isAdmin: next } : x)));
    } catch (err) {
      setError(err.message || `Could not ${next ? 'grant' : 'revoke'} admin access.`);
    } finally {
      setBusyUid(null);
    }
  }

  async function toggleDisabled(u) {
    const action = u.disabled ? 're-enable' : 'disable';
    if (!window.confirm(`${action === 'disable' ? 'Disable' : 'Re-enable'} sign-in for ${u.email || u.uid}?`)) return;
    setBusyUid(u.uid);
    try {
      await setUserDisabled(u.uid, !u.disabled);
      setUsers((prev) => prev.map((x) => (x.uid === u.uid ? { ...x, disabled: !x.disabled } : x)));
    } catch (err) {
      setError(err.message || `Could not ${action} this account.`);
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-2.5">
        <Users className="size-5 text-[#8a6d00] dark:text-juow-accent" />
        <h1 className="font-[family-name:var(--font-anton)] text-2xl font-bold text-foreground">Users</h1>
      </div>

      {fallbackReason && (
        <div className="mb-4 rounded-[2px] border border-juow-accent/40 bg-juow-accent/10 px-3 py-2 text-xs text-foreground">
          <p className="font-medium">Showing the accounts saved in Firestore (users/{'{uid}'}).</p>
          <p className="mt-1 text-muted-foreground">
            The server API couldn&apos;t list every Firebase account ({fallbackReason}). Accounts appear here the next time they sign in; the
            disable/enable action needs the API. To list all accounts, deploy to Vercel (or run <code>vercel dev</code>) and set
            FIREBASE_SERVICE_ACCOUNT_KEY.
          </p>
        </div>
      )}

      {error && (
        <p className="mb-4 text-sm text-destructive">
          {error}
          {error.includes('FIREBASE_SERVICE_ACCOUNT_KEY') && (
            <>
              {' '}
              — this tab needs a Firebase service account key set up server-side (see the README for setup steps).
            </>
          )}
        </p>
      )}

      {users && users.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="pl-8" />
          {nextPageToken && q && (
            <p className="mt-1 text-xs text-muted-foreground">Searching the accounts loaded so far - use “Load more” to include the rest.</p>
          )}
        </div>
      )}

      {users === null && !error ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : users?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No accounts yet.</p>
      ) : users ? (
        <>
          {visibleUsers.length === 0 && <p className="mb-3 text-sm text-muted-foreground">No accounts match that search.</p>}
          <ul className="divide-y divide-border rounded-[2px] border border-border bg-muted/20">
            {visibleUsers.map((u) => (
              <li key={u.uid} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{u.displayName || u.email || u.uid}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Joined {fmtDate(u.createdAt)}</p>
                  <p>Last seen {fmtDate(u.lastSignInAt)}</p>
                </div>
                {u.uid === me?.uid && (
                  <span className="rounded-[2px] bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">You</span>
                )}
                {u.isAdmin && (
                  <span className="rounded-[2px] bg-juow-accent/15 px-2 py-0.5 text-xs font-medium text-[#8a6d00] dark:text-juow-accent">
                    Admin
                  </span>
                )}
                {u.disabled && (
                  <span className="rounded-[2px] bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    Disabled
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => toggleAdmin(u)}
                  disabled={busyUid === u.uid || u.uid === me?.uid}
                  title={u.uid === me?.uid ? "You can't change your own admin access" : undefined}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-[2px] border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-juow-accent disabled:opacity-40"
                >
                  {u.isAdmin ? <ShieldMinus className="size-3.5" /> : <ShieldPlus className="size-3.5" />}
                  {u.isAdmin ? 'Revoke admin' : 'Make admin'}
                </button>
                {!fallbackReason && <button
                  type="button"
                  onClick={() => toggleDisabled(u)}
                  disabled={busyUid === u.uid || u.uid === me?.uid}
                  title={u.uid === me?.uid ? "You can't disable your own account" : undefined}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-[2px] border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-40"
                >
                  {busyUid === u.uid ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : u.disabled ? (
                    <ShieldCheck className="size-3.5" />
                  ) : (
                    <ShieldBan className="size-3.5" />
                  )}
                  {u.disabled ? 'Re-enable' : 'Disable'}
                </button>}
              </li>
            ))}
          </ul>

          {nextPageToken && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-4 inline-flex items-center gap-1.5 rounded-[2px] border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-juow-accent"
            >
              {loadingMore && <Loader2 className="size-4 animate-spin" />}
              Load more
            </button>
          )}
        </>
      ) : null}
    </div>
  );
}
