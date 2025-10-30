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
  const navMenuRef = useRef(null);
  const lastScrollY = useRef(0);

  const toggleMenu = () => setIsMenuOpen((s) => !s);
  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
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
    closeMenu();

    if (id === "dashboard") {
      if (location.pathname !== "/dashboard") {
        navigate("/dashboard");
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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isMenuOpen &&
        navMenuRef.current &&
        !navMenuRef.current.contains(event.target) &&
        !event.target.closest('.nav-toggle')
      ) {
        closeMenu();
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Close menu when user scrolls (NEW FIX)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Close menu if user scrolls more than 50px
      if (isMenuOpen && Math.abs(currentScrollY - lastScrollY.current) > 50) {
        closeMenu();
      }
      
      lastScrollY.current = currentScrollY;
    };

    if (isMenuOpen) {
      window.addEventListener("scroll", handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isMenuOpen]);

  // Close menu when route changes (NEW FIX)
  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  // Prevent scroll restoration by browser
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // When route changes TO dashboard, force scrollTop = 0
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

        <ul
          ref={navMenuRef}
          className={`nav-menu ${isMenuOpen ? "active" : ""}`}
        >
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
              <Link to="/login" className="login-btn" onClick={closeMenu}>
                Login
              </Link>
            )}
          </li>
        </ul>

        {/* User icon visible on desktop */}
        {user && (
          <div className="user-profile-desktop">
            <div className="user-icon-desktop">
              {(user.name || "U")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          </div>
        )}

        <div className="nav-toggle" onClick={toggleMenu}>
          {user ? (
            <div className="user-icon">
              {(user.name || "U")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          ) : (
            <div className="hamburger">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
