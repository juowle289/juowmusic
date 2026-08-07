import afterHours from './lyrics/afterHours.json';
import ballroomExtravaganza from './lyrics/ballroomExtravaganza.json';
import blue from './lyrics/blue.json';
import chungTaCuaTuongLai from './lyrics/chungTaCuaTuongLai.json';
import hayTraoChoAnh from './lyrics/hayTraoChoAnh.json';
import nerves from './lyrics/nerves.json';
import oneOfTheGirls from './lyrics/oneOfTheGirls.json';
import theColorViolet from './lyrics/theColorViolet.json';

const DEFAULT_VINYL = 'https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/Collections/vinylMusicDisk.jpg';

/** Tracks with local audio files — used for global player queue. */
export const playableTracks = [
  afterHours,
  ballroomExtravaganza,
  blue,
  chungTaCuaTuongLai,
  hayTraoChoAnh,
  nerves,
  oneOfTheGirls,
  theColorViolet,
].map((song) => ({
  slug: song.slug,
  songTitle: song.songTitle,
  artistName: song.artistName,
  coverSrc: song.coverSrc,
  audioSrc: song.audioSrc,
  vinylDiskSrc: DEFAULT_VINYL,
}));

export const tracksBySlug = Object.fromEntries(playableTracks.map((t) => [t.slug, t]));
