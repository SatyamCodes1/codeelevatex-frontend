// src/components/Footer.tsx
import React, { useState } from "react";
import { FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { manageSubscription } from "../api"; // ✅ Import the API function

const Footer: React.FC = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setMessage("Please enter an email.");
      return;
    }

    try {
      // Call backend to subscribe the email
      const res = await manageSubscription(email, true); // subscribe = true
      setMessage(res.message || "Subscribed successfully! ✅");
      setEmail(""); // clear input
    } catch (err: any) {
      console.error(err);
      setMessage(err?.response?.data?.message || "Subscription failed. Try again.");
    }
  };

  return (
    <footer className="footer">
      <div className="footer-container">

        {/* Branding */}
        <div className="footer-brand">
          <img 
            src="\codeElevateXlogo.png" 
            alt="codeElevateX Logo" 
            className="footer-logo" 
          />
          <p>Level up your coding skills with futuristic courses and tutorials.</p>
          <div className="social-icons">
            <button type="button" aria-label="Facebook"><FaFacebookF /></button>
            <button type="button" aria-label="Twitter"><FaTwitter /></button>
            <button type="button" aria-label="Instagram"><FaInstagram /></button>
            <button type="button" aria-label="LinkedIn"><FaLinkedinIn /></button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer-links">
          <h3>Quick Links</h3>
          <ul>
            <li>
              <button onClick={() => document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" })}>
                Courses
              </button>
            </li>
            <li>
              <button onClick={() => document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth" })}>
                Quiz
              </button>
            </li>
            <li>
              <button onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}>
                About Us
              </button>
            </li>
            <li>
              <button onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}>
                Contact
              </button>
            </li>
          </ul>
        </div>

        {/* Resources */}
        <div className="footer-links">
          <h3>Resources</h3>
          <ul>
            <li><button>Blog</button></li>
            <li><button>Help Center</button></li>
            <li><button>Support</button></li>
            <li><button>FAQs</button></li>
          </ul>
        </div>

        {/* Newsletter */}
        <div className="footer-newsletter">
          <h3>Newsletter</h3>
          <p>Subscribe for coding updates & offers.</p>
          <form className="newsletter-form" onSubmit={handleSubscribe}>
            <input 
              type="email" 
              placeholder="Your email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
            <button type="submit">Subscribe</button>
          </form>
          {message && <p className="subscribe-message">{message}</p>}
        </div>

      </div>

      {/* Footer bottom */}
      <div className="footer-bottom">
        &copy; {new Date().getFullYear()} codeElevateX. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
