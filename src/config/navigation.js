// The home page's own menu. Other pages (lyrics / artist / profile) show the
// same items as links back to "/#id" until their own section menu takes over.
export const HOME_NAV = [
  { href: '#featured', label: 'Artists', id: 'featured' },
  { href: '#songs', label: 'Tracks', id: 'songs' },
  { href: '#contact', label: 'Contact', id: 'contact' },
];

export const LYRIC_NAV = [
  { href: '#lyrics', label: 'Lyrics', id: 'lyrics' },
  { href: '#about', label: 'About', id: 'about' },
  { href: '#qa', label: 'Q&A', id: 'qa' },
  { href: '#cmt', label: 'Comments', id: 'cmt' },
];

export const ARTIST_NAV = [
  { href: '#section2', label: 'Top Tracks', id: 'section2' },
  { href: '#section3', label: 'Fanbase', id: 'section3' },
  { href: '#section4', label: 'Popular Songs', id: 'section4' },
  { href: '#section5', label: 'Albums', id: 'section5' },
  { href: '#section6', label: 'Similar Artists', id: 'section6' },
  { href: '#faq', label: 'Artist FAQ', id: 'faq' },
];
