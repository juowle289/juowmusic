import { Link } from "react-router-dom";
import SearchBox from "@/components/SearchBox";

/** Minimal header for auth pages. */
export default function AuthHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between bg-black/90 px-6 backdrop-blur-md">
      <Link to="/">
        <img
          src="https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/logo-juowmusic.png"
          alt="Juowle logo"
          className="h-10 w-auto"
        />
      </Link>
      <SearchBox />
    </header>
  );
}
