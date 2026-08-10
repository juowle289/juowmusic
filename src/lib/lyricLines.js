/**
 * Pulls the actual sung lyric lines out of a song's `lyricHtml` string, in
 * document order, skipping section markers ([Verse 1], [Chorus], etc - each
 * one is a `<p><q>...</q></p>`, never a plain `<p>text</p>`). Both
 * LyricPage (for click-to-seek) and the lyric sync tool (for recording
 * timestamps) use this exact same extraction so a line's index always means
 * the same line in both places.
 *
 * Returns an array of `{ lineIndex, text }`, where `lineIndex` also happens
 * to be the position in the array - kept as an explicit field because it's
 * what gets used as the key into a song's `lineTimestamps` array.
 */
export function extractLyricLines(lyricHtml) {
  if (!lyricHtml) return [];
  const doc = new DOMParser().parseFromString(lyricHtml, 'text/html');
  const lines = [];
  doc.querySelectorAll('p').forEach((p) => {
    if (p.querySelector('q')) return; // section header, not a sung line
    const text = p.textContent.trim();
    if (!text) return;
    lines.push({ lineIndex: lines.length, text });
  });
  return lines;
}

/**
 * Given a click target somewhere inside a lyric container and the same
 * container's root element, finds which "sung line" index (matching
 * `extractLyricLines`'s ordering) was clicked, or null if the click landed
 * on a section header / outside any line. Walks the *actual rendered DOM*
 * (not a re-parsed string) so it always matches exactly what's on screen.
 */
export function findClickedLineIndex(containerEl, target) {
  const p = target.closest('p');
  if (!p || !containerEl.contains(p)) return null;
  if (p.querySelector('q')) return null; // section header

  let index = -1;
  const paragraphs = containerEl.querySelectorAll('p');
  for (const el of paragraphs) {
    if (el.querySelector('q')) continue;
    index += 1;
    if (el === p) return index;
  }
  return null;
}
