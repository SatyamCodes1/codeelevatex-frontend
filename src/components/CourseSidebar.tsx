import React, { useState } from "react";
import { useCourse, Course, Enrollment } from "../context/CourseContext";
import { Lesson } from "../types";
import "../styles/CourseSidebar.css";

// ---- Component Props ----
interface CourseSidebarProps {
  onLessonSelect: (lesson: Lesson) => void;
  currentLessonId?: string;
  completedLessons?: string[]; // ✅ Dynamic completed lessons
  onMarkAsRead?: (lessonId: string) => void; // ✅ Callback for marking lesson
}

// ---- Component ----
const CourseSidebar: React.FC<CourseSidebarProps> = ({
  onLessonSelect,
  currentLessonId,
  completedLessons = [],
  onMarkAsRead,
}) => {
  const { currentCourse, enrollment } = useCourse() as {
    currentCourse: Course | null;
    enrollment: Enrollment | null;
  };

  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  if (!currentCourse) return null;

  // --- Toggle Unit Collapse/Expand ---
  const toggleUnit = (unitId: string) => {
    const newExpanded = new Set(expandedUnits);
    if (newExpanded.has(unitId)) newExpanded.delete(unitId);
    else newExpanded.add(unitId);
    setExpandedUnits(newExpanded);
  };

  // --- Check Lesson Completed ---
  const isLessonCompleted = (lessonId: string) => completedLessons.includes(lessonId);

  // --- Check Lesson Access ---
  const isLessonAccessible = (lesson: Lesson) => {
    if (!enrollment || enrollment.accessLevel !== "full") return lesson.isPreview;
    return true;
  };

  // --- Handle Mark as Read ---
  const handleMarkAsRead = (lesson: Lesson) => {
    if (!isLessonAccessible(lesson)) return;
    onMarkAsRead?.(lesson._id);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <h3 className="sidebar-title">Course Structure</h3>

        <div className="sidebar-units">
          {currentCourse.units?.map((unit) => {
            const unitCompleted = unit.lessons.every((lesson) => isLessonCompleted(lesson._id));

            return (
              <div key={unit.unitId} className="sidebar-unit">
                {/* ----- Unit Header ----- */}
                <button onClick={() => toggleUnit(unit.unitId)} className="unit-header">
                  <div className="unit-header-left">
                    <div className="unit-icon">
                      {unitCompleted ? (
                        <div className="unit-completed-icon">
                          <svg className="unit-checkmark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="unit-number">{unit.unitId}</div>
                      )}
                    </div>

                    <div className="unit-info">
                      <h4 className="unit-title">{unit.title}</h4>
                      <p className="unit-lessons-count">
                        {unit.lessons.length} lesson{unit.lessons.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <svg
                    className={`unit-chevron ${expandedUnits.has(unit.unitId) ? "rotated" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* ----- Lessons List ----- */}
                {expandedUnits.has(unit.unitId) && (
                  <div className="unit-lessons">
                    {unit.lessons.map((lesson: Lesson) => {
                      const isCompleted = isLessonCompleted(lesson._id);
                      const isAccessible = isLessonAccessible(lesson);
                      const isCurrent = lesson._id === currentLessonId;

                      return (
                        <button
                          key={lesson._id}
                          onClick={() => {
                            if (isAccessible) {
                              onLessonSelect(lesson);
                              handleMarkAsRead(lesson);
                            }
                          }}
                          className={`lesson-item ${isCurrent ? "current" : ""} ${!isAccessible ? "disabled" : ""}`}
                          disabled={!isAccessible}
                        >
                          <div className="lesson-icon">
                            {isCompleted ? (
                              <div className="lesson-completed">
                                <svg className="lesson-checkmark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            ) : isCurrent ? (
                              <div className="lesson-current"></div>
                            ) : (
                              <div className="lesson-not-started"></div>
                            )}
                          </div>

                          <div className="lesson-info">
                            <div className="lesson-title-row">
                              <span className="lesson-title">{lesson.title}</span>
                              {lesson.isPreview && <span className="lesson-preview">Preview</span>}
                            </div>

                            <div className="lesson-meta">
                              {lesson.type === "quiz" && <span className="lesson-meta-icon">❓</span>}
                              {lesson.type === "coding" && <span className="lesson-meta-icon">💻</span>}
                              {lesson.duration && <span className="lesson-duration">{lesson.duration} min</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

export default CourseSidebar;
