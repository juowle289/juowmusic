import { escapeHtml } from '@/lib/escapeHtml';

const SECTION_RE = /^\[(.+)\]$/;

/** Plain-text lyrics -> the <p>/<b><q> markup LyricPage expects. A line in
 * brackets ("[Verse 1]") becomes a section heading; blank lines start a new
 * block. All text is HTML-escaped (lyrics with "<3" or "&" used to break the
 * page, and raw HTML typed in the admin was injected as-is). */
export function lyricsToHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return '';
      const html = lines
        .map((line) => {
          const heading = SECTION_RE.exec(line);
          return heading ? `<b></b><p><q>${escapeHtml(heading[1])}</q></p>` : `<p>${escapeHtml(line)}</p>`;
        })
        .join('\n');
      return `${html}\n<br/>`;
    })
    .filter(Boolean)
    .join('\n');
}

/** { sung, sections } line counts - `sung` matches the index space of a
 * song's `lineTimestamps` (section headings don't count). */
export function lyricStats(text) {
  let sung = 0;
  let sections = 0;
  String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      if (SECTION_RE.test(line)) sections += 1;
      else sung += 1;
    });
  return { sung, sections };
}
