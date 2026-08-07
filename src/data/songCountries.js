/**
 * Which country each playable song "belongs" to, keyed by the song's slug
 * (see data/playableTracks.js) and by ISO 3166-1 numeric country code -
 * the same id scheme world-atlas's topojson uses for country geometries,
 * so GlobeExplorer can go country click -> id -> songs with one lookup,
 * no name-matching required.
 *
 * The country is the primary artist's nationality (same country each
 * artist's flag already points at in data/artists/*.json), not the song's
 * language or chart performance.
 */
export const SONG_COUNTRY_ID = {
  chungTaCuaTuongLai: '704', // Vietnam — Sơn Tùng M-TP
  hayTraoChoAnh: '704', // Vietnam — Sơn Tùng M-TP
  nerves: '410', // South Korea — DPR IAN
  ballroomExtravaganza: '410', // South Korea — DPR IAN
  afterHours: '124', // Canada — The Weeknd
  oneOfTheGirls: '124', // Canada — The Weeknd
  theColorViolet: '124', // Canada — Tory Lanez
  blue: '840', // United States of America — Billie Eilish
};

export const COUNTRY_NAMES_BY_ID = {
  704: 'Vietnam',
  410: 'South Korea',
  124: 'Canada',
  840: 'United States',
};
