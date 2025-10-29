import React, { useState } from "react";
import "../styles/Contact.css";

const Contact: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setStatusMessage("");

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/contact/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus("success");
        setStatusMessage(data.message || "Message sent successfully! We'll get back to you soon.");
        setName("");
        setEmail("");
        setMessage("");
      } else {
        setStatus("error");
        setStatusMessage(data.error || "Failed to send message. Please try again.");
      }
    } catch (error) {
      setStatus("error");
      setStatusMessage("Network error. Please check your connection and try again.");
      console.error("Contact form error:", error);
    }
  };

  return (
    <div className="contact-page container">
      <h1 className="section__title">Contact Us</h1>
      <p className="section__subtitle">
        Have questions or suggestions? Send us a message.
      </p>

      <form onSubmit={handleSubmit} className="contact-form">
        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field"
          required
          disabled={status === "sending"}
        />
        <input
          type="email"
          placeholder="Your Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          required
          disabled={status === "sending"}
        />
        <textarea
          placeholder="Your Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input-field"
          rows={5}
          required
          disabled={status === "sending"}
        ></textarea>

        {statusMessage && (
          <div className={`status-message ${status === "success" ? "success" : "error"}`}>
            {statusMessage}
          </div>
        )}

        <div className="button-container">
          <button 
            type="submit" 
            className="btn btn--primary btn--lg"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending..." : "Send Message"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Contact;
