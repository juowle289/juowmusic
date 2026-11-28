import { GENRES } from '@/data/genres';

/**
 * A plain, native <select> for genre - deliberately not a fancy combobox,
 * since the whole point is steering people toward the shared taxonomy
 * instead of free-typing near-duplicates ("K Pop" vs "Kpop" vs "K-Pop").
 * If the current value isn't one of the presets (an older free-typed value,
 * or one of the two-tier "Korean R&B/Soul" style ones not picked), it's
 * still shown as a selectable option so editing doesn't silently change it.
 */
export default function GenreSelect({ value, onChange, className }) {
  const options = value && !GENRES.includes(value) ? [value, ...GENRES] : GENRES;
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={
        className ??
        'h-8 w-full rounded-[2px] border border-input bg-transparent px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
      }
    >
      <option value="">Select a genre…</option>
      {options.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
    </select>
  );
}
