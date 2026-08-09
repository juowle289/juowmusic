/**
 * Generic `onError` handler for `<img>` tags across the app. Swaps a broken
 * image's src for a small inline SVG placeholder instead of leaving the
 * browser's default "broken image" icon on screen when a link 404s or the
 * network drops - works for any shape (circular avatars, square covers,
 * small icons) since it just fills whatever box the original `<img>`'s
 * className already sized/rounded, no layout changes needed.
 *
 * Usage: <img src={...} onError={handleImageError} />
 */
const PLACEHOLDER_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<rect width="100" height="100" fill="#1a1a1a"/>' +
      '<path d="M50 30a12 12 0 100 24 12 12 0 000-24zm0 30c-12 0-24 6-24 14v6h48v-6c0-8-12-14-24-14z" fill="#4a4a4a"/>' +
      '</svg>',
  );

export function handleImageError(event) {
  const img = event.currentTarget;
  // Guard against the placeholder itself somehow also failing to load,
  // which would otherwise fire this handler again and again forever.
  if (img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = 'true';
  img.src = PLACEHOLDER_SVG;
}
