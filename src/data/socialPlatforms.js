/**
 * Preset platforms for the admin Links and Fanbase fields - each carries the
 * Font Awesome icon class and brand color the public artist page's LinkIcon
 * component expects, so picking "Instagram" from a dropdown looks right
 * immediately instead of needing someone to know/paste a Font Awesome class
 * and hex code by hand.
 */
export const SOCIAL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: 'fa-brands fa-instagram', color: '#E1306C' },
  { id: 'youtube', label: 'YouTube', icon: 'fa-brands fa-youtube', color: '#FF0000' },
  { id: 'spotify', label: 'Spotify', icon: 'fa-brands fa-spotify', color: '#1DB954' },
  { id: 'tiktok', label: 'TikTok', icon: 'fa-brands fa-tiktok', color: '#000000' },
  { id: 'facebook', label: 'Facebook', icon: 'fa-brands fa-facebook', color: '#1877F2' },
  { id: 'x', label: 'X (Twitter)', icon: 'fa-brands fa-x-twitter', color: '#000000' },
  { id: 'soundcloud', label: 'SoundCloud', icon: 'fa-brands fa-soundcloud', color: '#FF5500' },
  { id: 'apple-music', label: 'Apple Music', icon: 'fa-brands fa-apple', color: '#FA243C' },
  { id: 'website', label: 'Website', icon: 'fa-solid fa-globe', color: '#555555' },
  { id: 'other', label: 'Other', icon: 'fa-solid fa-link', color: '#777777' },
];

export function platformById(id) {
  return SOCIAL_PLATFORMS.find((p) => p.id === id) ?? SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1];
}

/**
 * Fanbase platforms - a *different*, fixed list from SOCIAL_PLATFORMS above:
 * ArtistPage.jsx's Fanbase section only ever shows these exact six platform
 * names, in this exact order (its FAN_ORDER constant), so this list has to
 * match that naming precisely (e.g. "Twitter", not "X") for a fanbase entry
 * to actually render.
 */
export const FANBASE_PLATFORMS = [
  { platform: 'Spotify', icon: 'fa-brands fa-spotify', iconColor: '#1DB954', defaultLabel: 'Monthly Listeners' },
  { platform: 'Instagram', icon: 'fa-brands fa-instagram', iconColor: '#E1306C', defaultLabel: 'Followers' },
  { platform: 'YouTube', icon: 'fa-brands fa-youtube', iconColor: '#FF0000', defaultLabel: 'Subscribers' },
  { platform: 'TikTok', icon: 'fa-brands fa-tiktok', iconColor: '#000000', defaultLabel: 'Followers' },
  { platform: 'Twitter', icon: 'fa-brands fa-x-twitter', iconColor: '#000000', defaultLabel: 'Followers' },
  { platform: 'Facebook', icon: 'fa-brands fa-facebook', iconColor: '#1877F2', defaultLabel: 'Followers' },
];
