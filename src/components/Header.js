// src/components/Header.js
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SECTIONS = ["home", "courses", "about"];
const PAGE_LINKS = ["dashboard", "community", "contact"];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const tickingRef = useRef(false);
  const lastActiveRef = useRef("home");

  const toggleMenu = () => setIsMenuOpen((s) => !s);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    if (section) {
      window.scrollTo({
        top: section.offsetTop - 70,
        behavior: "smooth",
      });
    }
  };

  const handleClick = (e, id) => {
    e.preventDefault();
    if (isMenuOpen) setIsMenuOpen(false);

    if (id === "dashboard") {
      if (location.pathname !== "/dashboard") {
        // 👇 Navigate first
        navigate("/dashboard");
        // 👇 Force scrollTop after navigation
        setTimeout(() => window.scrollTo({ top: 0, behavior: "instant" }), 50);
      }
      setActiveSection(id);
      return;
    }

    if (PAGE_LINKS.includes(id)) {
      navigate(`/${id}`);
      setActiveSection(id);
      return;
    }

    if (id === "home") {
      if (location.pathname === "/") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        window.history.replaceState(null, "", "#home");
      } else {
        navigate("/");
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
          window.history.replaceState(null, "", "#home");
        }, 120);
      }
      setActiveSection("home");
      lastActiveRef.current = "home";
      return;
    }

    if (location.pathname === "/") {
      scrollToSection(id);
      setActiveSection(id);
      lastActiveRef.current = id;
      window.history.replaceState(null, "", `#${id}`);
    } else {
      navigate("/");
      setTimeout(() => {
        scrollToSection(id);
        setActiveSection(id);
        lastActiveRef.current = id;
        window.history.replaceState(null, "", `#${id}`);
      }, 120);
    }
  };

  // 🧠 Prevent scroll restoration by browser
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // 🧭 When route changes TO dashboard, force scrollTop = 0
  useEffect(() => {
    if (location.pathname === "/dashboard") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location.pathname]);

  // Scroll highlight
  useEffect(() => {
    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;

      window.requestAnimationFrame(() => {
        const scrolledNow = window.scrollY > 50;
        if (scrolledNow !== scrolled) setScrolled(scrolledNow);

        let current = "home";
        for (let id of SECTIONS) {
          const section = document.getElementById(id);
          if (section && window.scrollY >= section.offsetTop - 80) {
            current = id;
          }
        }

        if (lastActiveRef.current !== current) {
          lastActiveRef.current = current;
          setActiveSection(current);
          if (location.pathname === "/") {
            window.history.replaceState(null, "", `#${current}`);
          }
        }

        tickingRef.current = false;
      });
    };

    if (location.pathname === "/")
      window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll, { passive: true });
    };
  }, [location.pathname, scrolled]);

  useEffect(() => {
    const path = location.pathname.replace("/", "");
    if (PAGE_LINKS.includes(path)) {
      setActiveSection(path);
    }
  }, [location.pathname]);

  return (
    <header className={`header ${scrolled ? "scrolled" : ""}`}>
      <nav className="nav-container">
        <Link
          to="/"
          className="logo-link"
          onClick={(e) => handleClick(e, "home")}
        >
          <img
            src="/codeElevateXlogo.png"
            alt="CodeElevateX"
            className="logo"
          />
        </Link>

        <ul className={`nav-menu ${isMenuOpen ? "active" : ""}`}>
          {[...SECTIONS, ...PAGE_LINKS].map((id) => (
            <li key={id}>
              <a
                href="#"
                onClick={(e) => handleClick(e, id)}
                className={`nav-link ${
                  activeSection === id ? "active-link" : ""
                }`}
              >
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </a>
            </li>
          ))}

          <li>
            {user ? (
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            ) : (
              <Link to="/login" className="login-btn">
                Login
              </Link>
            )}
          </li>
        </ul>

        <div className="nav-toggle" onClick={toggleMenu}>
          {user ? (
            <div className="user-icon">
              {(user.name || "")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          ) : (
            <span className="hamburger"></span>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
