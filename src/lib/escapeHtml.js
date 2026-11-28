/** Escapes text for safe insertion into an HTML string (used before values
 * typed in the admin are fed to dangerouslySetInnerHTML on public pages). */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Plain multi-line text -> one escaped <p> per non-empty line. */
export function textToParagraphs(text) {
  return String(text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('\n');
}
