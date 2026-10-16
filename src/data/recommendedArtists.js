/**
 * Every artist the app currently knows about, with their genre. This is the single
 * source of truth for genre-based matching: the home page's "Recommended Artists" /
 * "Who is this artist?" carousels (ALL_ARTISTS minus Sơn Tùng M-TP - see
 * RECOMMENDED_ARTISTS below), and each artist page's "Similar Artists" section (see
 * ArtistPage.jsx), which sorts this list by genre match against the artist being
 * viewed instead of using a hand-picked list per artist.
 *
 * `to` is the artist's own page, or null while the artist doesn't have one yet -
 * set it here once /artist/<slug> exists for them.
 */
export const ALL_ARTISTS = [
  {
    name: 'Sơn Tùng M-TP',
    genre: 'Vietnamese Pop',
    img: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Artist/mtp-avtArtist.jpg',
    flag: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Flag/Canada.webp',
    to: '/artist/son-tung-mtp',
  },
  {
    name: 'The Weeknd',
    genre: 'R&B/Soul',
    img: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Artist/TheWeeknd-avtArtist.jpg',
    flag: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Flag/Canada.webp',
    to: '/artist/the-weeknd',
  },
  {
    name: 'Billie Eilish',
    genre: 'Indie Pop',
    img: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Artist/billieEilish-avtArtist.jpg',
    flag: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Flag/US.webp',
    to: null,
  },
  {
    name: 'DPR IAN',
    genre: 'Korean R&B/Soul',
    img: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Artist/DPRIAN-avtartist.jpg',
    flag: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Flag/SouthKorea.webp',
    to: null,
  },
  {
    name: 'Taylor Swift',
    genre: 'Pop',
    img: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Artist/TaylorSwift-avtartist.jpg',
    flag: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Flag/US.webp',
    to: null,
  },
  {
    name: 'Jungkook',
    genre: 'K-Pop',
    img: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Artist/Jungkook-avtartist.jpg',
    flag: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Flag/SouthKorea.webp',
    to: null,
  },
  {
    name: 'Charlie Puth',
    genre: 'Pop',
    img: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Artist/CharliePuth-avtartist.jpg',
    flag: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Flag/US.webp',
    to: null,
  },
  {
    name: 'Justin Bieber',
    genre: 'Pop',
    img: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Artist/JustinBieber-avtartist.jpg',
    flag: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Flag/Canada.webp',
    to: null,
  },
];

// Home page carousels: every known artist except Sơn Tùng M-TP (unchanged from before).
export const RECOMMENDED_ARTISTS = ALL_ARTISTS.filter((a) => a.name !== 'Sơn Tùng M-TP');
