/**
 * Shared genre taxonomy for the admin Song and Artist forms. Values match
 * what's already used in src/data/recommendedArtists.js and the artist
 * JSON files (e.g. 'R&B/Soul', 'Vietnamese Pop') so genre-matching features
 * like ArtistPage's "Similar Artists" keep working for admin-created
 * content too - it only matches on an exact string, so staying consistent
 * with these existing values (rather than letting people free-type genres)
 * is what makes that matching actually find things.
 */
export const GENRES = [
  'Pop',
  'Vietnamese Pop',
  'K-Pop',
  'Indie Pop',
  'R&B/Soul',
  'Korean R&B/Soul',
  'Hip-Hop/Rap',
  'Alternative',
  'Rock',
  'Electronic/EDM',
  'Ballad',
  'Lo-fi',
  'Jazz',
  'Classical',
  'Country',
  'Latin',
  'Reggae',
  'Folk',
];
