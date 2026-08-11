import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from '@/layouts/AppLayout';
import AuthLayout from '@/layouts/AuthLayout';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import AuthActionPage from '@/pages/AuthActionPage';
import LyricPage from '@/pages/LyricPage';
import MusicLoader from '@/components/MusicLoader';

// Code-split the heaviest pages: ArtistPage (large per-artist JSON payloads)
// and ProfilePage (pulls in recharts, which is a sizeable chart library that
// most visits to the site never touch). Splitting these out of the main
// bundle means the very first load - Home / a lyric page - ships noticeably
// less JS.
const ArtistPage = lazy(() => import('@/pages/ArtistPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const LyricSyncTool = lazy(() => import('@/pages/LyricSyncTool'));
const PartyPage = lazy(() => import('@/pages/PartyPage'));

function LazyFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <MusicLoader />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/artist/:slug"
            element={
              <Suspense fallback={<LazyFallback />}>
                <ArtistPage />
              </Suspense>
            }
          />
          <Route path="/lyrics/:slug" element={<LyricPage />} />
          <Route
            path="/party/:partyId"
            element={
              <Suspense fallback={<LazyFallback />}>
                <PartyPage />
              </Suspense>
            }
          />
          <Route
            path="/profile"
            element={
              <Suspense fallback={<LazyFallback />}>
                <ProfilePage />
              </Suspense>
            }
          />
          <Route path="*" element={<HomePage />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/action" element={<AuthActionPage />} />
        </Route>

        <Route
          path="/tools/lyric-sync/:slug"
          element={
            <Suspense fallback={<LazyFallback />}>
              <LyricSyncTool />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
