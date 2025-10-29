import React from "react";
import "../styles/Community.css";

const Community: React.FC = () => {
  return (
    <div className="community-page container">
      <h1 className="section__title">Join Our Community</h1>
      <p className="section__subtitle">
        Connect with other learners, share knowledge, and get help from experts!
      </p>

      {/* Only Join Discord button */}
      <div className="community-links">
        <a
          href="https://discord.gg/your-server-link"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--primary btn--lg"
        >
          Join Discord
        </a>
      </div>
    </div>
  );
};

export default Community;
