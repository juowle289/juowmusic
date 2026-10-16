import sonTung from './son-tung-mtp.json';
import theWeeknd from './the-weeknd.json';

/** Every artist that has a full profile page, keyed by slug. Single source of
 * truth shared by ArtistPage (renders the page) and anything else that needs
 * an artist's full data by slug (e.g. the Profile page's follow notifications). */
export const ARTISTS_BY_SLUG = {
  'son-tung-mtp': sonTung,
  'the-weeknd': theWeeknd,
};
