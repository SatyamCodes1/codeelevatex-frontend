import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { useCourse } from '../context/CourseContext';
import { AiOutlinePlayCircle } from 'react-icons/ai';
import '../styles/CourseHeader.css';

const CourseHeader: React.FC = () => {
  const { user } = useUser();
  const { currentCourse, progress } = useCourse();

  const [showResumePopup, setShowResumePopup] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const progressPercentage: number = progress?.overallPercentage ?? 0;

  // ✅ Load user preference from sessionStorage
  useEffect(() => {
    const sessionPref = sessionStorage.getItem('hideResumePopup');
    if (sessionPref === 'true') {
      setDontShowAgain(true);
    }
  }, []);

  // ✅ Show popup if progress exists and user hasn't hidden it
  useEffect(() => {
    if (currentCourse && progress && progressPercentage > 0 && !dontShowAgain) {
      setShowResumePopup(true);
    }
  }, [currentCourse, progress, progressPercentage, dontShowAgain]);

  // ✅ Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowResumePopup(false);
      }
    };

    if (showResumePopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showResumePopup]);

  // ✅ Resume current lesson
  const handleResume = () => {
    const currentLesson = progress?.currentLesson;

    if (currentLesson) {
      console.log(`Resuming lesson: ${currentLesson}`);
      // Example: navigate(`/course/${currentCourse._id}/lesson/${currentLesson}`);
    }

    setShowResumePopup(false);
  };

  // ✅ Toggle “Don’t show again” setting
  const handleDontShowAgain = (checked: boolean) => {
    setDontShowAgain(checked);
    if (checked) {
      sessionStorage.setItem('hideResumePopup', 'true');
      setShowResumePopup(false);
    } else {
      sessionStorage.removeItem('hideResumePopup');
    }
  };

  if (!currentCourse) return null;

  return (
    <>
      {/* Header Section */}
      <header className="ch-header">
        <div className="ch-header-inner">
          <div className="ch-info-progress">
            {/* Circular Progress */}
            <div className="ch-circular-progress">
              <svg className="ch-svg-outer">
                <circle cx="32" cy="32" r="28" className="ch-circle-bg" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  className="ch-circle-progress"
                  style={{ strokeDashoffset: 175.929 - (175.929 * progressPercentage) / 100 }}
                />
              </svg>
              <div className="ch-circle-text">{progressPercentage}%</div>
            </div>

            {/* Course Details */}
            <div className="ch-course-details">
              <h1>{currentCourse.title}</h1>
              <div className="ch-progress-meta">
                {user && <span>Learning as {user.name}</span>}
                {progress && (
                  <>
                    <span>•</span>
                    <span>{progress.totalTimeSpent} minutes spent</span>
                    <span>•</span>
                    <span>ETA: {progress.estimatedTimeRemaining} minutes</span>
                  </>
                )}
              </div>

              {/* Linear Progress Bar */}
              <div className="ch-linear-progress">
                <div className="ch-linear-fill" style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>
          </div>

          {/* Resume Button */}
          {progressPercentage > 0 && (
            <button className="ch-resume-header-btn" onClick={handleResume}>
              <AiOutlinePlayCircle size={20} />
              <span>Resume Learning</span>
            </button>
          )}
        </div>
      </header>

      {/* Resume Popup */}
      {showResumePopup && (
        <div className="ch-popup-overlay">
          <div ref={popupRef} className="ch-popup-card">
            <AiOutlinePlayCircle size={50} className="ch-popup-icon" />
            <h2>Resume Your Learning</h2>
            <button className="ch-popup-resume-btn" onClick={handleResume}>
              Resume Learning
            </button>
            <label className="ch-popup-checkbox">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => handleDontShowAgain(e.target.checked)}
              />
              <span>Don't show again</span>
            </label>
          </div>
        </div>
      )}
    </>
  );
};

export default CourseHeader;
