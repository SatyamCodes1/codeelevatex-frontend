import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useCourse } from "../context/CourseContext";
import { useUser } from "../context/UserContext";
import {
  Lesson,
  LessonContent,
  convertMongoQuizToQuestion,
  convertMongoCodingToProblem,
  convertMongoExampleToExample,
} from "../types";

// Components
import CourseHeader from "../components/CourseHeader";
import CourseSidebar from "../components/CourseSidebar";
import TabNavigation from "../components/TabNavigation";
import ExplanationTab from "../components/content/ExplanationTab";
import ExamplesTab from "../components/content/ExamplesTab";
import QuizTab from "../components/content/QuizTab";
import CodingTab from "../components/content/CodingTab";
import Comments from "../components/Comments";
import AIAssistant from "../components/AIAssistant";

import "../styles/CoursePage.css";

const CoursePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const courseId = id || "";

  const { user, token: userToken } = useUser();
  const {
    loadCourse,
    currentCourse,
    loading,
    enrollInCourse,
    enrolledCourseIds,
    enrollmentsLoaded,
    progress,
    updateLessonProgress,
    loadEnrollments,
  } = useCourse();

  const [activeTab, setActiveTab] = useState<"explanation" | "examples" | "quiz" | "coding">(
    () => (localStorage.getItem(`activeTab-${courseId}`) as any) || "explanation"
  );

  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [courseLoaded, setCourseLoaded] = useState(false);

  const isEnrolled = enrolledCourseIds.includes(courseId);

  // ✅ Load course ONLY ONCE on mount
  useEffect(() => {
    if (!courseId || courseLoaded) return;

    console.log("[CoursePage] Loading course:", courseId);
    loadCourse(courseId)
      .then(() => {
        setCourseLoaded(true);
        console.log("[CoursePage] Course loaded successfully");
      })
      .catch((err) => {
        console.error("[CoursePage] loadCourse error:", err);
        setCourseLoaded(true); // Mark as attempted even on error
      });
  }, [courseId]); // Remove loadCourse from dependencies

  // ✅ Load enrollments when user/token changes
  useEffect(() => {
    if (!courseId || !user || !userToken) return;

    console.log("[CoursePage] Loading enrollments...");
    loadEnrollments().catch((err) => console.error("[CoursePage] loadEnrollments error:", err));
  }, [courseId, user, userToken]); // Remove loadEnrollments from dependencies

  // ✅ Set first lesson when course data changes
  useEffect(() => {
    if (!currentCourse || !currentCourse.units || courseLoaded === false) return;

    console.log("[CoursePage] Setting lessons from course");

    // Flatten all lessons from all units
    const allLessons: Lesson[] = [];
    currentCourse.units.forEach((unit, unitIndex) => {
      if (unit.lessons && unit.lessons.length > 0) {
        console.log(`[CoursePage] Unit ${unitIndex} has ${unit.lessons.length} lessons`);
        allLessons.push(...(unit.lessons as Lesson[]));
      }
    });

    if (allLessons.length === 0) {
      console.warn("[CoursePage] No lessons found in course");
      return;
    }

    // Get stored lesson or use first
    const storedLessonId = localStorage.getItem(`currentLesson-${courseId}`);
    let lessonToSet = allLessons.find((l) => l._id === storedLessonId) || allLessons[0];

    if (lessonToSet && (!currentLesson || currentLesson._id !== lessonToSet._id)) {
      console.log("[CoursePage] Setting lesson:", lessonToSet.title);
      setCurrentLesson(lessonToSet);
    }
  }, [currentCourse, courseId, courseLoaded]); // Removed currentLesson to prevent loops

  // Persist current lesson
  useEffect(() => {
    if (currentLesson) {
      localStorage.setItem(`currentLesson-${courseId}`, currentLesson._id);
    }
  }, [currentLesson, courseId]);

  // Persist active tab
  useEffect(() => {
    localStorage.setItem(`activeTab-${courseId}`, activeTab);
  }, [activeTab, courseId]);

  // ✅ Fetch lesson content - prevent infinite calls
  useEffect(() => {
    if (!currentLesson || !isEnrolled) {
      setLessonContent(null);
      return;
    }

    setContentLoading(true);

    fetch(`${process.env.REACT_APP_API_URL}/lessons/${currentLesson._id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(userToken && { Authorization: `Bearer ${userToken}` }),
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        console.log("[CoursePage] Lesson content loaded");
        const content: LessonContent = {
          explanation: data.lesson?.explanation || data.explanation || [],
          examples: data.lesson?.examples || data.examples || [],
          quiz: data.lesson?.quiz || data.quiz || [],
          coding: data.lesson?.coding || data.coding || [],
        };
        setLessonContent(content);
      })
      .catch((err) => {
        console.error("[CoursePage] Error fetching content:", err);
        // Fallback to lesson object content
        if (currentLesson.content) {
          setLessonContent(currentLesson.content);
        } else {
          setLessonContent({
            explanation: [],
            examples: [],
            quiz: [],
            coding: [],
          });
        }
      })
      .finally(() => setContentLoading(false));
  }, [currentLesson, isEnrolled, userToken]);

  // Sync completed lessons from progress
  useEffect(() => {
    if (!progress || !progress.detailedProgress) return;

    const completed: string[] = [];
    progress.detailedProgress.forEach((p) => {
      if (p.status === "completed" && p.lessonId) {
        completed.push(p.lessonId);
      }
    });

    setCompletedLessons(completed);
  }, [progress]);

  const handleLessonSelect = useCallback((lesson: Lesson) => {
    console.log("[CoursePage] Selected lesson:", lesson.title);
    setCurrentLesson(lesson);

    if (lesson.type === "quiz") setActiveTab("quiz");
    else if (lesson.type === "coding") setActiveTab("coding");
    else if (lesson.type === "examples" || lesson.type === "video") setActiveTab("examples");
    else setActiveTab("explanation");
  }, []);

  const handleEnrollNow = async () => {
    if (!user || !currentCourse) {
      alert("Please log in to enroll.");
      return;
    }

    setEnrolling(true);
    try {
      const result = await enrollInCourse(currentCourse._id);
      if (!result.success) {
        alert(result.message || "Enrollment failed");
      } else {
        await loadEnrollments();
      }
    } catch (err) {
      console.error("[CoursePage] Enrollment error:", err);
      alert("Enrollment failed. Please try again.");
    } finally {
      setEnrolling(false);
    }
  };

  const handleMarkAsRead = useCallback(async (lessonId: string) => {
    if (!completedLessons.includes(lessonId)) {
      const res = await updateLessonProgress(lessonId, { status: "completed" });
      if (res.success) {
        setCompletedLessons((prev) => [...prev, lessonId]);
      }
    }
  }, [completedLessons, updateLessonProgress]);

  const tabs = [
    { id: "explanation", label: "Explanation", icon: "📖", lessonId: currentLesson?._id },
    { id: "examples", label: "Examples", icon: "💡", lessonId: currentLesson?._id },
    { id: "quiz", label: "Quiz Practice", icon: "❓", lessonId: currentLesson?._id },
    { id: "coding", label: "Coding Practice", icon: "💻", lessonId: currentLesson?._id },
  ];

  const convertedExamples = (lessonContent?.examples || [])
    .map((ex: any) => {
      try {
        return convertMongoExampleToExample(ex);
      } catch (err) {
        console.error("[CoursePage] Error converting example:", err);
        return null;
      }
    })
    .filter((item): item is Exclude<typeof item, null> => item !== null);

  const convertedQuiz = {
    questions: (lessonContent?.quiz || [])
      .map((q: any) => {
        try {
          return convertMongoQuizToQuestion(q);
        } catch (err) {
          console.error("[CoursePage] Error converting quiz:", err);
          return null;
        }
      })
      .filter((item): item is Exclude<typeof item, null> => item !== null),
  };

  const convertedCoding = (lessonContent?.coding || [])
    .map((c: any) => {
      try {
        return convertMongoCodingToProblem(c);
      } catch (err) {
        console.error("[CoursePage] Error converting coding:", err);
        return null;
      }
    })
    .filter((item): item is Exclude<typeof item, null> => item !== null);

  const showLoading = !courseLoaded && loading;

  if (showLoading) {
    return (
      <div className="coursepage-loading-container">
        <div className="coursepage-loading-box">
          <div className="coursepage-spinner"></div>
          <p>Loading course...</p>
        </div>
      </div>
    );
  }

  if (!currentCourse) {
    return (
      <div className="coursepage-loading-container">
        <div className="coursepage-loading-box">
          <h2>Course Not Found</h2>
          <p>The course you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="coursepage-container">
      <CourseHeader />
      <div className="coursepage-main">
        <CourseSidebar
          onLessonSelect={handleLessonSelect}
          currentLessonId={currentLesson?._id}
          completedLessons={completedLessons}
          onMarkAsRead={handleMarkAsRead}
        />
        <div className="coursepage-content">
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            courseId={courseId}
            token={userToken || ""}
            onTabChange={(tabId: string) =>
              setActiveTab(tabId as "explanation" | "examples" | "quiz" | "coding")
            }
            completedLessons={completedLessons}
            lessonStatuses={completedLessons.reduce((acc, id) => ({ ...acc, [id]: true }), {})}
          />
          <div className="coursepage-tabcontent">
            {isEnrolled || currentLesson?.isPreview ? (
              <>
                {contentLoading ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
                    <div className="coursepage-spinner" style={{ marginBottom: "20px" }}></div>
                    <p>Loading lesson content...</p>
                  </div>
                ) : !lessonContent ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
                    <p>No content available for this lesson.</p>
                  </div>
                ) : (
                  <>
                    {activeTab === "explanation" && currentLesson && (
                      <ExplanationTab lesson={currentLesson} content={lessonContent} />
                    )}
                    {activeTab === "examples" && currentLesson && (
                      <ExamplesTab lesson={currentLesson} examples={convertedExamples} />
                    )}
                    {activeTab === "quiz" && currentLesson && (
                      <QuizTab lesson={currentLesson} quiz={convertedQuiz} />
                    )}
                    {activeTab === "coding" && currentLesson && (
                      <CodingTab lesson={currentLesson} problems={convertedCoding} />
                    )}
                    {currentLesson && (
                      <Comments courseId={currentCourse._id} lessonId={currentLesson._id} />
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="coursepage-enroll-wrapper">
                <h3>Enroll to Access Full Content</h3>
                <p>You can preview some lessons in the sidebar.</p>
                <button onClick={handleEnrollNow} disabled={enrolling}>
                  {enrolling ? "Enrolling..." : `Enroll Now - ₹${currentCourse?.price ?? 0}`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {currentLesson && isEnrolled && lessonContent && (
        <AIAssistant
          courseId={currentCourse._id}
          currentLesson={{
            lessonId: currentLesson._id,
            title: currentLesson.title,
            type:
              currentLesson.type === "video" ||
              currentLesson.type === "examples" ||
              currentLesson.type === "text"
                ? "explanation"
                : (currentLesson.type as "coding" | "quiz" | "explanation" | undefined),
          }}
        />
      )}
    </div>
  );
};

export default CoursePage;
