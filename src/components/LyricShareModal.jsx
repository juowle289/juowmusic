import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Quote } from 'lucide-react';
import { handleImageError } from '@/lib/imageFallback';

/** Pulls the first hex colour out of a song's customStyle CSS string (its
 * `nav { background-image: linear-gradient(#a, #b) }` rule) so the share
 * card can pick up the same mood/colour as that song's hero, instead of
 * looking generic. Falls back to the site's gold accent if none is found. */
export function extractAccentColor(customStyle) {
  if (!customStyle) return '#feec93';
  const match = customStyle.match(/#[0-9a-fA-F]{3,6}/);
  return match ? match[0] : '#feec93';
}

export default function LyricShareModal({ open, onClose, quote, songTitle, artistName, coverSrc, accentColor }) {
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement('a');
      link.download = `${songTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-lyric.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // If image export fails for some reason (e.g. a cross-origin cover
      // image without CORS headers), there's nothing actionable to show the
      // user beyond leaving the card visible so they can screenshot it.
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center gap-5"
          >
            {/* The card itself - this exact node is what gets exported to PNG. */}
            <div
              ref={cardRef}
              className="relative flex aspect-[4/5] w-[320px] flex-col justify-between overflow-hidden rounded-2xl p-8 text-white sm:w-[380px]"
              style={{
                backgroundImage: `linear-gradient(160deg, ${accentColor}dd, #000 85%), url(${coverSrc})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <Quote className="size-8 opacity-70" style={{ color: accentColor }} />

              <p className="font-[family-name:var(--font-anton)] text-2xl leading-snug sm:text-3xl">
                &ldquo;{quote}&rdquo;
              </p>

              <div className="flex items-center gap-3">
                <img src={coverSrc} alt="" className="size-10 rounded object-cover" onError={handleImageError} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{songTitle}</p>
                  <p className="truncate text-xs text-white/70">{artistName}</p>
                </div>
                <span className="ml-auto shrink-0 font-[family-name:var(--font-anton)] text-sm opacity-60">
                  Juowle
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-2 rounded-full bg-juow-accent px-5 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Download className="size-4" /> {downloading ? 'Preparing…' : 'Download PNG'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm text-white/80 hover:text-white"
              >
                <X className="size-4" /> Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
