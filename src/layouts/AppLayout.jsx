import { Outlet, useMatch } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import GlobalAudioPlayer from '@/components/GlobalAudioPlayer';
import useListeningTracker from '@/hooks/useListeningTracker';
import { ARTIST_NAV, HOME_NAV, LYRIC_NAV } from '@/config/navigation';

function useHeaderConfig() {
  const homeMatch = useMatch('/');
  const lyricMatch = useMatch('/lyrics/:slug');
  const artistMatch = useMatch('/artist/:slug');
  const exploreMatch = useMatch('/explore');

  if (homeMatch) {
    return { variant: 'home', menuItems: HOME_NAV };
  }
  if (lyricMatch) {
    return { variant: 'section', menuItems: LYRIC_NAV };
  }
  if (artistMatch) {
    return { variant: 'section', menuItems: ARTIST_NAV };
  }
  if (exploreMatch) {
    return { variant: 'section', menuItems: [] };
  }

  return null;
}

export default function AppLayout() {
  const headerConfig = useHeaderConfig();
  useListeningTracker();

  return (
    <>
      {headerConfig && <AppHeader variant={headerConfig.variant} menuItems={headerConfig.menuItems} />}
      <Outlet />
      <GlobalAudioPlayer />
    </>
  );
}
