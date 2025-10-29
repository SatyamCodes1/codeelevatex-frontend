import axios, { AxiosRequestConfig } from "axios";

// ================== AXIOS INSTANCE ==================
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
});

// Helper: Attach token
const getAuthHeaders = (token?: string): AxiosRequestConfig["headers"] =>
  token ? { Authorization: `Bearer ${token}` } : {};

// ================== TYPES ==================
export interface UserData {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  avatar?: string;
  isVerified?: boolean;
  lastLogin?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: UserData;
  message?: string;
}

export interface CoursePayload {
  title: string;
  description?: string;
  price?: number;
  category?: "programming" | "design" | "business" | "other";
  icon?: string;
  level?: "beginner" | "intermediate" | "advanced";
}

export interface Course {
  _id: string;
  title: string;
  description?: string;
  price?: number;
  category?: string;
  icon?: string;
  level?: string;
  units?: Unit[];
}

export interface UnitPayload {
  title: string;
  description?: string;
  order?: number;
}

export interface LessonPayload {
  title: string;
  type: "video" | "text" | "quiz" | "coding" | "assignment" | "explanation" | "example";
  content?: any;
  duration?: number;
  isPreview?: boolean;
  order?: number;
}

export interface Unit {
  unitId: string;
  title: string;
  description?: string;
  order?: number;
  lessons: Lesson[];
}

export interface Lesson {
  lessonId: string;
  title: string;
  type: "video" | "text" | "quiz" | "coding" | "assignment" | "explanation" | "example";
  content?: any;
  duration?: number;
  isPreview?: boolean;
  order?: number;
}

// ================== PROGRESS TYPES ==================
export interface LessonProgress {
  lessonId: string;
  status: "not_started" | "in_progress" | "completed";
  timeSpent: number; // in seconds
  score?: number;
  lessonProgress?: {
    quizAttempts?: any[];
    codingSubmissions?: any[];
  };
  startedAt?: string;
  lastAccessedAt?: string;
  completedAt?: string;
}

export interface CourseProgress {
  courseId: string;
  courseName: string;
  totalLessons: number;
  completedLessons: number;
  overallPercentage: number;
  totalTimeSpent: number; // in minutes
  estimatedTimeRemaining: number; // in minutes
  currentUnit?: string;
  currentLesson?: string;
  lastAccessed?: string;
  detailedProgress: LessonProgress[];
}

export interface DashboardStats {
  totalCourses: number;
  completedCourses: number;
  activeCourses: number;
  totalTimeSpent: number;
  averageProgress: number;
  recentActivity: {
    courseId: string;
    courseName: string;
    thumbnail?: string;
    progress: number;
    lastAccessed: string;
  }[];
}

// ================== AUTH ==================

// Login
export const loginUser = async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
  const res = await API.post("/auth/login", credentials);
  return res.data;
};

// Register
export const registerUser = async (credentials: { name: string; email: string; password: string }): Promise<AuthResponse> => {
  const res = await API.post("/auth/register", credentials);
  return res.data;
};

// Send OTP
export const sendOtp = async (email: string): Promise<{ success: boolean; message?: string }> => {
  const res = await API.post("/auth/send-otp", { email });
  return res.data;
};

// Verify OTP
export const verifyOtp = async (email: string, otp: string): Promise<AuthResponse> => {
  const res = await API.post("/auth/verify-otp", { email, otp });
  return res.data;
};

// Forgot Password
export const forgotPassword = async (email: string): Promise<{ success: boolean; token?: string }> => {
  const res = await API.post("/auth/forgot-password", { email });
  return res.data;
};

// Reset Password
export const resetPassword = async (token: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
  const res = await API.post(`/auth/reset-password/${token}`, { password: newPassword });
  return res.data;
};

// Manage Subscription
export const manageSubscription = async (email: string, subscribe: boolean): Promise<{ success: boolean; message?: string }> => {
  const res = await API.post("/auth/subscription", { email, subscribe });
  return res.data;
};

// ================== COURSES ==================

// GET all courses
export const getCourses = async (token?: string): Promise<Course[]> => {
  const res = await API.get("/courses", { headers: getAuthHeaders(token) });
  return res.data?.courses || [];
};

// GET single course
export const getCourse = async (id: string, token?: string): Promise<Course | null> => {
  const res = await API.get(`/courses/${id}`, { headers: getAuthHeaders(token) });
  return res.data?.course || null;
};

// CREATE course
export const createCourse = async (course: CoursePayload, token?: string) => {
  const res = await API.post("/courses", course, { headers: getAuthHeaders(token) });
  return res.data;
};

// UPDATE course
export const updateCourse = async (id: string, course: Partial<CoursePayload>, token?: string) => {
  const res = await API.put(`/courses/${id}`, course, { headers: getAuthHeaders(token) });
  return res.data;
};

// DELETE course
export const deleteCourse = async (id: string, token?: string) => {
  const res = await API.delete(`/courses/${id}`, { headers: getAuthHeaders(token) });
  return res.data;
};

// ================== UNITS ==================

// ADD Unit
export const addUnit = async (courseId: string, unit: UnitPayload, token?: string) => {
  const res = await API.post(`/courses/${courseId}/unit`, unit, { headers: getAuthHeaders(token) });
  return res.data?.course || null;
};

// UPDATE Unit
export const updateUnit = async (courseId: string, unitId: string, unit: Partial<UnitPayload>, token?: string) => {
  const res = await API.put(`/courses/${courseId}/unit/${unitId}`, unit, { headers: getAuthHeaders(token) });
  return res.data?.course || null;
};

// DELETE Unit
export const deleteUnit = async (courseId: string, unitId: string, token?: string) => {
  const res = await API.delete(`/courses/${courseId}/unit/${unitId}`, { headers: getAuthHeaders(token) });
  return res.data?.course || null;
};

// ================== LESSONS ==================

// ADD Lesson
export const addLesson = async (courseId: string, unitId: string, lesson: LessonPayload, token?: string) => {
  const res = await API.post(`/courses/${courseId}/unit/${unitId}/lesson`, lesson, { headers: getAuthHeaders(token) });
  return res.data?.course || null;
};

// UPDATE Lesson
export const updateLesson = async (courseId: string, unitId: string, lessonId: string, lesson: Partial<LessonPayload>, token?: string) => {
  const res = await API.put(`/courses/${courseId}/unit/${unitId}/lesson/${lessonId}`, lesson, { headers: getAuthHeaders(token) });
  return res.data?.course || null;
};

// DELETE Lesson
export const deleteLesson = async (courseId: string, unitId: string, lessonId: string, token?: string) => {
  const res = await API.delete(`/courses/${courseId}/unit/${unitId}/lesson/${lessonId}`, { headers: getAuthHeaders(token) });
  return res.data?.course || null;
};

// ================== ENROLLMENTS ==================

// Enroll in a course
export const enrollCourse = async (
  courseId: string,
  token?: string,
  paymentData?: { paymentMethod?: string; amountPaid?: number }
) => {
  const res = await API.post(`/courses/${courseId}/enroll`, paymentData || {}, { headers: getAuthHeaders(token) });
  return res.data;
};

// Get user enrollments
export const getUserEnrollments = async (token?: string) => {
  const res = await API.get("/enrollments/my/enrollments", { headers: getAuthHeaders(token) });
  return res.data?.data || [];
};

// ================== PROGRESS ==================

// Get course progress
export const getCourseProgress = async (courseId: string, token?: string): Promise<CourseProgress | null> => {
  const res = await API.get(`/progress/course/${courseId}`, { headers: getAuthHeaders(token) });
  return res.data?.progress || null;
};

// Update lesson progress
export const updateLessonProgress = async (
  lessonId: string,
  payload: {
    courseId: string;
    status?: 'not_started' | 'in_progress' | 'completed';
    timeSpent?: number;
    score?: number;
    quizAnswers?: any;
    codingSubmission?: any;
  },
  token?: string
): Promise<LessonProgress | null> => {
  const res = await API.post(`/progress/lesson/${lessonId}`, payload, { headers: getAuthHeaders(token) });
  return res.data?.progress || null;
};

// Get dashboard stats
export const getDashboardStats = async (token?: string): Promise<DashboardStats | null> => {
  const res = await API.get(`/progress/dashboard`, { headers: getAuthHeaders(token) });
  return res.data?.stats || null;
};

// ================== HELPER ==================

// Flatten a course tree: units → lessons
export const flattenCourse = (course: Course) => {
  const flatLessons: (Lesson & { unitTitle: string; unitId: string })[] = [];
  course.units?.forEach((unit) => {
    unit.lessons.forEach((lesson) => {
      flatLessons.push({ ...lesson, unitTitle: unit.title, unitId: unit.unitId });
    });
  });
  return flatLessons;
};

export default API;
