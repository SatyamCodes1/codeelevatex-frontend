// src/components/Hero.tsx
import React from "react";

interface HeroProps {
  onExplore: () => void; // ✅ Prop to scroll to courses
}

const Hero: React.FC<HeroProps> = ({ onExplore }) => {
  return (
    <section className="hero">
      <div className="container">
        <h1>Welcome to CodeElevateX</h1>
        <p>Learn coding at your pace with interactive courses and quizzes</p>

        {/* Explore Courses button scrolls to courses */}
        <button className="btn btn--warning" onClick={onExplore}>
          Explore Courses
        </button>
      </div>
    </section>
  );
};

export default Hero;




