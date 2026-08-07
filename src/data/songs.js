// Data used to power the header search suggestions across every page.
// Mirrors the `songs` array that used to live in js/home.js and js/lyric.js.
export const songs = [
  { imgSrc: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Collections/MoodswingsInThisOrder.jpg', title: 'Nerves', artist: 'DPR IAN', views: '162.9K', link: '/lyrics/nerves' },
  { imgSrc: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Collections/MITO.png', title: 'Ballroom Extravaganza', artist: 'DPR IAN', views: '611.1K', link: '/lyrics/ballroomExtravaganza' },
  { imgSrc: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Collections/Chungtacuatuonglai.jpg', title: 'Chúng Ta Của Tương Lai', artist: 'Sơn Tùng M-TP', views: '6.3M', link: '/lyrics/chungTaCuaTuongLai' },
  { imgSrc: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Collections/hayTraoChoAnh.jpg', title: 'Hãy Trao Cho Anh', artist: 'Sơn Tùng M-TP', views: '270M', link: '/lyrics/hayTraoChoAnh' },
  { imgSrc: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Collections/oneOfTheGirls.jpg', title: 'One Of The Girls', artist: 'The Weeknd, JENNIE, Lily-Rose Deep', views: '1.1M', link: '/lyrics/oneOfTheGirls' },
  { imgSrc: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Collections/afterHours.jpg', title: 'After Hours', artist: 'The Weeknd', views: '212M', link: '/lyrics/afterHours' },
  { imgSrc: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Collections/popular.png', title: 'Popular', artist: 'The Weeknd', views: '619.1K', link: '#' },
  { imgSrc: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Collections/hitMeHardAndSoft.jpg', title: 'BLUE', artist: 'Billie Eilish', views: '611.1K', link: '/lyrics/blue' },
  { imgSrc: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Collections/hitMeHardAndSoft.jpg', title: 'CHIHIRO', artist: 'Billie Eilish', views: '856.1K', link: '#' },
  { imgSrc: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Collections/DrawnFM.jpg', title: 'Is There Someone Else', artist: 'The Weeknd', views: '830.7K', link: '#' },
  { imgSrc: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Collections/Dear-Melancholy.jpg', title: 'I Was Never There', artist: 'The Weeknd, Gesaffelstein', views: '1.5M', link: '#' },
  { imgSrc: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Collections/DearInsanity.jpg', title: 'Violet Crazy', artist: 'DPR IAN', views: '611.1K', link: '#' },
  { imgSrc: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Collections/starboy.jpg', title: 'Die For You', artist: 'The Weeknd', views: '4.3M', link: '#' },
  { imgSrc: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Collections/starboy.jpg', title: 'Starboy', artist: 'The Weeknd', views: '8.9M', link: '#' },
  { imgSrc: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Collections/MoodswingsInThisOrder.jpg', title: 'So Beautiful', artist: 'DPR IAN', views: '90.1K', link: '#' },
  { imgSrc: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Collections/theColorViolet.jpg', title: 'The Color Violet', artist: 'Tory Lanez', views: '31M', link: '/lyrics/theColorViolet' },
];

export const artists = [
  { avtArtist: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Artist/mtp-avtArtist.jpg', nameArtist: 'Sơn Tùng M-TP', link: '/artist/son-tung-mtp' },
  { avtArtist: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Artist/TheWeeknd-avtArtist.jpg', nameArtist: 'The Weeknd', link: '/artist/the-weeknd' },
  { avtArtist: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Artist/billieEilish-avtArtist.jpg', nameArtist: 'Billie Eilish', link: '#' },
  { avtArtist: 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Artist/DPRIAN-avtartist.jpg', nameArtist: 'DPR IAN', link: '#' },
];

function stripDiacritics(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function searchAll(query) {
  const q = stripDiacritics(query.trim());
  if (!q) return { matchedSongs: [], matchedArtists: [] };
  return {
    matchedSongs: songs.filter((s) => stripDiacritics(s.title).includes(q)),
    matchedArtists: artists.filter((a) => stripDiacritics(a.nameArtist).includes(q)),
  };
}
