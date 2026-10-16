import { useEffect } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import GlobalAudioPlayer from '@/components/GlobalAudioPlayer';
import ScrollToTop from '@/components/ScrollToTop';
import useListeningTracker from '@/hooks/useListeningTracker';
import useHashScroll from '@/hooks/useHashScroll';
import { useAuth } from '@/context/AuthContext';
import { useFollowStore } from '@/stores/useFollowStore';
import { ARTIST_NAV, HOME_NAV, LYRIC_NAV } from '@/config/navigation';

function useHeaderConfig() {
  const homeMatch = useMatch('/');
  const lyricMatch = useMatch('/lyrics/:slug');
  const artistMatch = useMatch('/artist/:slug');
  const exploreMatch = useMatch('/explore');
  const profileMatch = useMatch('/profile');

  if (homeMatch) {
    return { variant: 'home', menuItems: HOME_NAV };
  }
  // heroId: the element whose scrolling out of view swaps the header from the
  // home-style menu to this page's own sections (see AppHeader).
  if (lyricMatch) {
    return { variant: 'section', menuItems: LYRIC_NAV, heroId: 'song-hero' };
  }
  if (artistMatch) {
    return { variant: 'section', menuItems: ARTIST_NAV, heroId: 'artist-hero' };
  }
  if (profileMatch) {
    // No sections of its own: always the home-style menu.
    return { variant: 'section', menuItems: [], homeMenu: true };
  }
  if (exploreMatch) {
    return { variant: 'section', menuItems: [] };
  }

  return null;
}

export default function AppLayout() {
  const headerConfig = useHeaderConfig();
  useListeningTracker();
  useHashScroll();

  // Keeps the follow-store's followed-artists/notifications scoped to
  // whichever account is actually signed in right now (and empty while
  // signed out), across every page under this layout.
  const { user } = useAuth();
  const setFollowUser = useFollowStore((s) => s.setUser);
  useEffect(() => {
    setFollowUser(user?.uid ?? null);
  }, [user?.uid, setFollowUser]);

  return (
    <>
      {headerConfig && (
        <AppHeader
          variant={headerConfig.variant}
          menuItems={headerConfig.menuItems}
          heroId={headerConfig.heroId}
          homeMenu={headerConfig.homeMenu}
        />
      )}
      <Outlet />
      <ScrollToTop />
      <GlobalAudioPlayer />
    </>
  );
}
