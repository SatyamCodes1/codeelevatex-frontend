import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { Lesson } from "../types";

export interface LessonProgressData {
  status?: "not_started" | "in_progress" | "completed";
  timeSpent?: number;
  score?: number;
  quizAnswers?: any;
  codingSubmission?: any;
  submissionId?: string;
}

export interface Enrollment {
  _id: string;
  courseId: string;
  accessLevel: "preview" | "full";
  paymentStatus?: string;
  status?: string;
  progress?: {
    completedLessons: string[];
    currentLesson?: string;
    currentUnit?: string;
    totalProgress?: number;
    timeSpent?: number;
    lastAccessed?: string;
  };
}

export interface Progress {
  courseId: string;
  courseName: string;
  totalLessons: number;
  completedLessons: number;
  overallPercentage: number;
  totalTimeSpent: number;
  estimatedTimeRemaining: number;
  currentUnit?: string;
  currentLesson?: string;
  lastAccessed?: string;
  detailedProgress?: {
    lessonId: string;
    status: "not_started" | "in_progress" | "completed";
    timeSpent?: number;
    score?: number;
  }[];
}

export interface Course {
  _id: string;
  title: string;
  description?: string;
  price?: number;
  units?: {
    unitId: string;
    title: string;
    lessons: Lesson[];
  }[];
}

export interface CourseContextType {
  currentCourse: Course | null;
  enrollment: Enrollment | null;
  progress: Progress | null;
  loading: boolean;
  loadCourse: (courseId: string) => Promise<void>;
  updateLessonProgress: (
    lessonId: string,
    progressData: LessonProgressData
  ) => Promise<{ success: boolean; message?: string }>;
  enrollInCourse: (
    courseId: string,
    paymentData?: any
  ) => Promise<{ success: boolean; enrollment?: Enrollment; message?: string }>;
  isEnrolled: boolean;
  hasFullAccess: boolean;
  enrolledCourseIds: string[];
  enrollmentsLoaded: boolean;
  setProgress: (progress: Progress | null) => void;
  loadEnrollments: () => Promise<void>;
}

interface CourseProviderProps {
  children: ReactNode;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

const normalizeLesson = (lesson: any, courseId: string): Lesson => ({
  ...lesson,
  _id: lesson._id || lesson.lessonId || "unknown-id",
  lessonId: lesson.lessonId || lesson._id || "unknown-id",
  courseId,
  type: lesson.type === "text" || lesson.type === undefined ? "explanation" : lesson.type,
  duration: lesson.duration,
  content: lesson.content,
});

export const CourseProvider: React.FC<CourseProviderProps> = ({ children }) => {
  const { user, token } = useAuth();

  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(false);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [enrollmentsLoaded, setEnrollmentsLoaded] = useState(false);

  // ✅ FIXED: Remove /api from default (will be added in fetch calls)
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const loadEnrollments = useCallback(async () => {
    if (!user || !token) {
      setEnrollmentsLoaded(true);
      setEnrolledCourseIds([]);
      return;
    }
    try {
      // ✅ FIXED: Added /api prefix
      const res = await fetch(`${API_URL}/api/enrollments/my/enrollments`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (res.ok && data && Array.isArray(data.enrollments)) {
        const courseIds = data.enrollments
          .map((e: any) => (typeof e.courseId === "object" ? e.courseId._id : e.courseId))
          .filter(Boolean);
        setEnrolledCourseIds(courseIds);
      } else {
        setEnrolledCourseIds([]);
      }
    } catch (err) {
      console.error("[CourseContext] Load enrollments error:", err);
      setEnrolledCourseIds([]);
    } finally {
      setEnrollmentsLoaded(true);
    }
  }, [user, token, API_URL]);

  const enrollInCourse = async (courseId: string, paymentData?: any) => {
    if (!user || !token)
      return { success: false, message: "Please log in to enroll." };
    setLoading(true);
    try {
      // ✅ FIXED: Added /api prefix
      const res = await fetch(`${API_URL}/api/enrollments/${courseId}/enroll`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData || {}),
      });
      const data = await res.json();

      if (res.ok && data.enrollment) {
        const enrolledId = String(
          typeof data.enrollment.courseId === "object"
            ? data.enrollment.courseId._id
            : data.enrollment.courseId
        );
        setEnrollment({ ...data.enrollment, courseId: enrolledId });
        setEnrolledCourseIds((prev) =>
          prev.includes(enrolledId) ? prev : [...prev, enrolledId]
        );
        // Important: Refresh enrollment list
        await loadEnrollments();

        return { success: true, enrollment: data.enrollment };
      } else {
        return { success: false, message: data.message || "Enrollment failed" };
      }
    } catch (err) {
      console.error("[CourseContext] Enrollment error:", err);
      return { success: false, message: "Enrollment failed" };
    } finally {
      setLoading(false);
    }
  };

  const loadCourse = async (courseId: string) => {
    if (!courseId) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user && token) headers["Authorization"] = `Bearer ${token}`;

      // ✅ FIXED: Added /api prefix
      const res = await fetch(`${API_URL}/api/courses/${courseId}`, { headers });
      const data = await res.json();

      if (res.ok && data.course) {
        const courseData: Course = {
          ...data.course,
          _id: data.course._id || data.course.id,
        };

        courseData.units?.forEach((unit) => {
          unit.lessons = unit.lessons.map((lesson: any) =>
            normalizeLesson(lesson, courseData._id)
          );
        });

        setCurrentCourse(courseData);

        if (data.progress) {
          setProgress({
            courseId: data.progress.courseId,
            courseName: data.progress.courseName,
            totalLessons: data.progress.totalLessons,
            completedLessons: data.progress.completedLessons,
            overallPercentage: data.progress.overallPercentage,
            totalTimeSpent: data.progress.totalTimeSpent,
            estimatedTimeRemaining: data.progress.estimatedTimeRemaining,
            currentUnit: data.progress.currentUnit,
            currentLesson: data.progress.currentLesson,
            lastAccessed: data.progress.lastAccessed,
            detailedProgress: data.detailedProgress || [],
          });
        }

        if (data.enrollment) {
          const enrolledId = String(
            typeof data.enrollment.courseId === "object"
              ? data.enrollment.courseId._id
              : data.enrollment.courseId
          );

          setEnrollment({ ...data.enrollment, courseId: enrolledId });
          setEnrolledCourseIds((prev) =>
            prev.includes(courseData._id) ? prev : [...prev, courseData._id]
          );
        }
      }
    } catch (err) {
      console.error("[CourseContext] Course loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateLessonProgress = async (
    lessonId: string,
    progressData: LessonProgressData
  ) => {
    if (!user || !token || !currentCourse)
      return { success: false, message: "Not authorized" };
    try {
      // ✅ FIXED: Added /api prefix
      const res = await fetch(`${API_URL}/api/progress/lesson/${lessonId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseId: currentCourse._id, ...progressData }),
      });
      if (res.ok) {
        setProgress((prev) => {
          if (!prev) return prev;
          const updatedDetailed = [...(prev.detailedProgress || [])];
          const existing = updatedDetailed.find((p) => p.lessonId === lessonId);
          if (existing) {
            existing.status = progressData.status || existing.status;
            existing.timeSpent = progressData.timeSpent ?? existing.timeSpent;
            existing.score = progressData.score ?? existing.score;
          } else {
            updatedDetailed.push({
              lessonId,
              status: progressData.status || "not_started",
              timeSpent: progressData.timeSpent,
              score: progressData.score,
            });
          }
          return { ...prev, detailedProgress: updatedDetailed };
        });
        return { success: true };
      }
      const data = await res.json();
      return { success: false, message: data.message || "Failed to update progress" };
    } catch (err) {
      console.error("[CourseContext] Progress update error:", err);
      return { success: false, message: "Failed to update progress" };
    }
  };

  useEffect(() => {
    if (!user) {
      setEnrollment(null);
      setEnrolledCourseIds([]);
      setCurrentCourse(null);
      setProgress(null);
      setEnrollmentsLoaded(false);
    } else {
      loadEnrollments();
    }
  }, [user, token, loadEnrollments]);

  const isEnrolled =
    !!currentCourse &&
    ((enrollment && String(enrollment.courseId) === currentCourse._id) ||
      enrolledCourseIds.includes(currentCourse._id));

  return (
    <CourseContext.Provider
      value={{
        currentCourse,
        enrollment,
        progress,
        loading,
        loadCourse,
        updateLessonProgress,
        enrollInCourse,
        isEnrolled,
        hasFullAccess: enrollment?.accessLevel === "full",
        enrolledCourseIds,
        enrollmentsLoaded,
        setProgress,
        loadEnrollments,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
};

export const useCourse = (): CourseContextType => {
  const context = useContext(CourseContext);
  if (!context) throw new Error("useCourse must be used within a CourseProvider");
  return context;
};

export { CourseContext };
