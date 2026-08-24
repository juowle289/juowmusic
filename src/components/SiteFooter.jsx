import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { handleImageError } from "@/lib/imageFallback";

function FacebookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function SpotifyIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

// Not the literal trademarked wordmark-cloud - a plain cloud silhouette with
// a couple of short waveform ticks, enough to read as "SoundCloud" at 20px
// next to the other three brand glyphs without redrawing their exact path data.
function SoundCloudIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 4c-2.2 0-4.1 1.4-4.8 3.4C4.9 7.7 3 9.7 3 12.1 3 14.8 5.2 17 7.9 17h9.6A4.5 4.5 0 0 0 22 12.5c0-2.3-1.7-4.2-3.9-4.5C17.4 5.4 14.9 4 12 4z" />
      <rect x="1.3" y="13.3" width="1.1" height="3.7" rx="0.55" />
      <rect x="3.2" y="11.4" width="1.1" height="5.6" rx="0.55" />
    </svg>
  );
}

const FOOTER_LINKS = [
  { label: "Home", href: "/" },
  { label: "Songs", href: "/#songs" },
  { label: "News", href: "/#news" },
  { label: "Explore", href: "/explore" },
  { label: "Contact", href: "/#contact" },
];

const SOCIALS = [
  { label: "Facebook", href: "https://www.facebook.com/Duocthattha", Icon: FacebookIcon },
  { label: "Spotify", href: "https://open.spotify.com/user/31pm2sncp7nyw7o7i4ncnep25k3i?si=4a087f6556c94839", Icon: SpotifyIcon },
  { label: "Instagram", href: "https://www.instagram.com/juowlee/", Icon: InstagramIcon },
  { label: "SoundCloud", href: "https://on.soundcloud.com/pCRdP4WEYNZZuDqQd9", Icon: SoundCloudIcon },
];

export default function SiteFooter({ dark = false, className }) {
  return (
    <footer
      className={cn(
        "relative z-[1] border-t border-white/10 px-6 py-12 text-sm text-juow-soft sm:px-10",
        dark && "bg-black",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-x-12 gap-y-10">
        <div className="max-w-xs">
          <img
            src="https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/logo-juowmusic.png"
            alt=""
            className="h-12 w-auto"
            onError={handleImageError}
          />
          <p className="mt-4 text-white/50">A solo-built home for the songs I keep coming back to.</p>
        </div>

        <nav aria-label="Footer">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">Explore</p>
          <ul className="flex flex-col gap-2">
            {FOOTER_LINKS.map((link) =>
              link.href.startsWith("/#") ? (
                <li key={link.label}>
                  <a href={link.href} className="transition-colors hover:text-juow-accent">
                    {link.label}
                  </a>
                </li>
              ) : (
                <li key={link.label}>
                  <Link to={link.href} className="transition-colors hover:text-juow-accent">
                    {link.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">Legal</p>
          <ul className="flex flex-col gap-2">
            <li className="cursor-pointer transition-colors hover:text-juow-accent">Terms & conditions.</li>
            <li className="cursor-pointer transition-colors hover:text-juow-accent">Privacy Policy.</li>
            <li className="cursor-pointer transition-colors hover:text-juow-accent">Cookie Policy.</li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">Follow</p>
          <div className="flex items-center gap-4 text-lg">
            {SOCIALS.map(({ label, href, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}>
                <Icon className="size-5 transition-colors hover:text-juow-accent" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-6xl border-t border-white/10 pt-6 text-xs text-white/40">
        &copy;2024 Juowle. All Rights Reserved.
      </p>
    </footer>
  );
}
