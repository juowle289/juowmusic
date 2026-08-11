import { Link } from "react-router-dom";
import SearchBox from "./SearchBox";
import useHamburger from "../hooks/useHamburger";
import { useEffHeader, useHomeNavBorder } from "../hooks/useHeaderScroll";

export default function HomeHeader() {
  const { open, toggle, iconStyle, barsStyle } = useHamburger();
  const scrolled = useEffHeader();
  const activeNav = useHomeNavBorder();

  return (
    <header id="header" className={scrolled ? "effHeader" : ""}>
      <div className="logo">
        <Link to="/">
          <img
            src="https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/logo-juowmusic.png"
            alt="Juowle logo"
          />
        </Link>
      </div>
      <ul>
        <li
          id="header-menu"
          className={`clfeatured ${activeNav === "featured" ? "border" : ""}`}
        >
          <a href="#featured">Featured</a>
        </li>
        <li
          id="header-menu"
          className={`clnews ${activeNav === "news" ? "border" : ""}`}
        >
          <a href="#news">News</a>
        </li>
        <li
          id="header-menu"
          className={`clsongs ${activeNav === "songs" ? "border" : ""}`}
        >
          <a href="#songs">Songs</a>
        </li>

        <SearchBox />

        <li id="signUp">
          <Link to="/signup">Sign Up</Link>
        </li>
        <li id="logIn">
          <Link to="/login">Log In</Link>
        </li>
      </ul>

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
          <li className="clfeatured">
            <a href="#featured">Featured</a>
          </li>
          <li className="clnews">
            <a href="#news">News</a>
          </li>
          <li className="clsongs">
            <a href="#songs">Songs</a>
          </li>
        </ul>

        <footer>
          <div className="logo">
            <img
              src="https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/logo-juowmusic.png"
              alt=""
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
