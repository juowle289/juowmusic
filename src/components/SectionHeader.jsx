import { Link } from "react-router-dom";
import SearchBox from "./SearchBox";
import useHamburger from "../hooks/useHamburger";
import { useEffHeader, useScrollSpy } from "../hooks/useHeaderScroll";
import { handleImageError } from "@/lib/imageFallback";

/**
 * @param {{href:string, label:string}[]} menuItems
 * @param {'artist'|'lyric'} variant
 */
export default function SectionHeader({ menuItems, variant = "artist" }) {
  const { open, toggle, iconStyle, barsStyle } = useHamburger();
  const scrolled = useEffHeader();
  const sectionIds = menuItems.map((m) => m.href.replace("#", ""));
  const activeId = useScrollSpy(sectionIds);

  const barsMenuClass =
    variant === "artist" ? "header-bars-menu" : "header-menu";

  return (
    <header id="header" className={scrolled ? "effHeader" : ""}>
      <div className={variant === "artist" ? "logo d-flex" : "logo"}>
        <Link to="/">
          <img
            src="https://c47ipy4nf5mpbbsp.public.blob.vercel-storage.com/images/logo-juowmusic.png"
            alt="Juowle logo"
            onError={handleImageError}
          />
        </Link>
        <ul className="header-menu">
          {menuItems.map((item) => (
            <li
              key={item.href}
              className={
                activeId === item.href.replace("#", "") ? "active" : ""
              }
            >
              <a href={item.href}>{item.label} </a>
            </li>
          ))}
        </ul>
      </div>
      <ul>
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
        <div id="head-bars">
          <ul className={barsMenuClass}>
            {menuItems.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label} </a>
              </li>
            ))}
          </ul>
        </div>

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
