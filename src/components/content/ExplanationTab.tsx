import React, { useEffect, useState } from "react";
import { useCourse } from "../../context/CourseContext";
import { Lesson, LessonContent } from "../../types";
import "../../styles/ExplanationTab.css";

interface ExplanationTabProps {
  lesson: Lesson | null;
  content: LessonContent | null;
}

const ExplanationTab: React.FC<ExplanationTabProps> = ({ lesson, content }) => {
  const { updateLessonProgress, progress } = useCourse();
  const [isRead, setIsRead] = useState(false);

  // Initialize button state based on progress
  useEffect(() => {
    if (!lesson || !progress) return;

    const lessonProgress = progress.detailedProgress?.find(
      (p) => p.lessonId === lesson.lessonId
    );

    setIsRead(lessonProgress?.status === "completed");
  }, [lesson, progress]);

  const markAsRead = async () => {
    if (!lesson) return;

    const res = await updateLessonProgress(lesson.lessonId, {
      status: "completed",
      timeSpent: 60, // optional: track time spent
    });

    if (res.success) {
      setIsRead(true); // update local state immediately
    }
  };

  if (!content) {
    return (
      <div className="explanation-empty">
        <div className="explanation-empty-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <h3>No Content Available</h3>
        <p>This lesson doesn’t have any explanation content yet.</p>
      </div>
    );
  }

  return (
    <div className="explanation-container">
      <div className="explanation-header">
        <h1>{lesson?.title || "Lesson Content"}</h1>
      </div>

      <div className="explanation-content">
        {content.explanation?.map((text, idx) => (
          <p key={idx} style={{ marginBottom: "1rem", lineHeight: "1.6" }}>
            {text}
          </p>
        ))}
      </div>

      <div className="explanation-complete-btn">
        <button
          onClick={markAsRead}
          disabled={isRead}
          className={isRead ? "completed" : ""}
        >
          {isRead ? "Read ✅" : "Mark as Read"}
        </button>
      </div>
    </div>
  );
};

export default ExplanationTab;
