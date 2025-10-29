// src/components/About.tsx
import React from "react";
import { useNavigate } from "react-router-dom";

interface AboutProps {
  user: { id: string; email: string; role: string } | null;
}

const About: React.FC<AboutProps> = ({ user }) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate("/login");
  };

  return (
    <section className="about-section" id="about">
      <h2>About CodeElevateX</h2>

      <div className="about-content">
        <h3>
          CodeElevateX is your ultimate learning platform for coding. Join our Discord community, 
          use our AI assistant for coding help, take quizzes to test your skills, and dive into interactive coding tutorials.
        </h3>

        <div className="about-buttons">
          {/* Hide login button if user is logged in */}
          {!user && (
            <button className="btn btn--primary btn--round" onClick={handleLogin}>
              Login
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default About;
