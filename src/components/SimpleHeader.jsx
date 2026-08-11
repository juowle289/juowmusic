import { Link } from "react-router-dom";
import SearchBox from "./SearchBox";
import useHamburger from "../hooks/useHamburger";
import { handleImageError } from "@/lib/imageFallback";

export default function SimpleHeader() {
  const { open, toggle, iconStyle, barsStyle } = useHamburger();

  return (
    <header id="header">
      <div className="logo">
        <Link to="/">
          <img
            src="https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/logo-juowmusic.png"
            alt="Juowle logo"
            onError={handleImageError}
          />
        </Link>
      </div>

      <input type="checkbox" id="hamburger" checked={open} onChange={toggle} />
      <label htmlFor="hamburger" id="hamburger-label" onClick={toggle}>
        <i
          className="fa-solid fa-bars-staggered"
          id="bars-icon"
          style={iconStyle}
        ></i>
      </label>

      <div className="bars" style={barsStyle}>
        <ul id="head-bars">
          <li id="header-menu" className="clfeatured">
            <a href="#featured">Featured</a>
          </li>
          <li id="header-menu" className="clnews">
            <a href="#news">News</a>
          </li>
          <li id="header-menu" className="clsongs">
            <a href="#songs">Songs</a>
          </li>

          <SearchBox />
        </ul>

        <footer>
          <div className="logo">
            <img
              src="https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/logo-juowmusic.png"
              alt=""
              onError={handleImageError}
            />
          </div>
          <div id="foot-bars">
            <p>&copy;2024 Juowle. All Rights Reserved.</p>
            <p id="text-underline">Terms & conditions.</p>
            <p id="text-underline">Privacy Policy.</p>
            <p id="text-underline">Cookie Policy.</p>
          </div>
        </footer>
      </div>
    </header>
  );
}
