// src/App.tsx
import React, { FC, useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import Hero from "./components/Hero";
import CourseCard from "./components/CourseCard";
import LoginForm from "./components/LoginForm";
import Dashboard from "./components/Dashboard";
import AdminCourses from "./components/AdminCourses";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth, AuthProvider } from "./context/AuthContext";
import { UserProvider, useUser } from "./context/UserContext";
import ResetPassword from "./pages/ResetPassword";
import Footer from "./components/Footer";
import About from "./components/About";
import Community from "./pages/Community";
import Contact from "./pages/Contact";
import RazorpayPaymentPage from "./components/PaymentPage";
import { CourseProvider, useCourse } from "./context/CourseContext";
import CoursePage from "./pages/CoursePage";
import { CourseType } from "./types";

// API course shape from backend
interface APICourse {
  _id: string;
  title: string;
  description?: string;
  icon?: string;
  price?: number;
  category?: string;
}

// --- Loading Spinner Component ---
const LoadingSpinner: FC = () => (
  <div className="spinner-overlay">
    <div className="spinner"></div>
    <p className="spinner-text">Loading...</p>
  </div>
);

// --- AppInitializer (waits for auth to load) ---
const AppInitializer: FC = () => {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { loading: userLoading } = useUser();

  // Wait for both contexts to finish loading
  if (authLoading || userLoading) {
    return <LoadingSpinner />;
  }

  return (
    <CourseProvider>
      <AppContent />
    </CourseProvider>
  );
};

// --- AppContent (main app routes and logic) ---
const AppContent: FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { enrolledCourseIds } = useCourse();
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);
  const [courses, setCourses] = useState<CourseType[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Redirect after login if user tried enrolling
  useEffect(() => {
    if (user && pendingCourseId) {
      navigate(`/payment/${pendingCourseId}`);
      setPendingCourseId(null);
      setShowModal(false);
    }
  }, [user, pendingCourseId, navigate]);

  // Fetch courses from API
 // Fetch courses from API
useEffect(() => {
  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      // ✅ FIXED: Remove /api from base URL
      const apiUrl =
        process.env.REACT_APP_API_URL?.replace(/\/$/, "") ||
        "http://localhost:5000";
      
      const token = localStorage.getItem("authToken");

      // ✅ FIXED: Add /api/courses here explicitly
      const res = await fetch(`${apiUrl}/api/courses`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch courses: ${res.status}`);
      }

      const data = await res.json();

      // Handle different API response formats
      const coursesArray: APICourse[] =
        Array.isArray(data)
          ? data
          : Array.isArray(data.courses)
          ? data.courses
          : Array.isArray(data.data)
          ? data.data
          : [];

      // Map API courses to CourseType
      const mapped: CourseType[] = coursesArray.map((c: APICourse) => ({
        _id: c._id,
        id: c._id,
        title: c.title,
        description: c.description || "",
        icon: c.icon || "📚",
        price: c.price || 0,
        category: c.category || "other",
      }));

      setCourses(mapped);
      console.log("✅ Courses loaded successfully:", mapped.length);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  fetchCourses();
}, []);


  // Handle course enrollment click
  const handleCourseEnrollClick = (courseId: string) => {
    if (!user) {
      // User not logged in - show login modal
      setPendingCourseId(courseId);
      setShowModal(true);
    } else if (enrolledCourseIds.includes(courseId)) {
      // User already enrolled - go to course page
      navigate(`/course/${courseId}`);
    } else {
      // User logged in but not enrolled - go to payment
      navigate(`/payment/${courseId}`);
    }
  };

  // Handle login redirect from modal
  const handleLoginRedirect = () => {
    setShowModal(false);
    navigate("/login");
  };

  // Smooth scroll to courses section
  const scrollToCourses = () => {
    const coursesSection = document.getElementById("courses");
    if (coursesSection) {
      coursesSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (authLoading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Header />
      <main>
        <Routes>
          {/* ==================== LOGIN ROUTE ==================== */}
          <Route
            path="/login"
            element={
              !user ? (
                <div className="container">
                  <LoginForm />
                </div>
              ) : user.role === "admin" ? (
                <Navigate to="/admin" replace />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />

          {/* ==================== PASSWORD RESET ROUTE ==================== */}
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* ==================== PROTECTED ROUTES ==================== */}
          {/* User Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard courses={courses} />
              </ProtectedRoute>
            }
          />

          {/* Admin Dashboard */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminCourses />
              </ProtectedRoute>
            }
          />

          {/* Payment Page */}
          <Route
            path="/payment/:id"
            element={
              <ProtectedRoute>
                <RazorpayPaymentPage courses={courses} />
              </ProtectedRoute>
            }
          />

          {/* Course Page */}
          <Route
            path="/course/:id"
            element={
              <ProtectedRoute>
                <CoursePage />
              </ProtectedRoute>
            }
          />

          {/* ==================== PUBLIC PAGES ==================== */}
          <Route path="/community" element={<Community />} />
          <Route path="/contact" element={<Contact />} />

          {/* ==================== HOME PAGE ==================== */}
          <Route
            path="/"
            element={
              <>
                {/* Hero Section */}
                <Hero onExplore={scrollToCourses} />

                {/* Courses Section */}
                <section id="courses" className="section bg-gray">
                  <div className="container">
                    <h2 className="section__title">Our Courses</h2>

                    {loadingCourses ? (
                      <div className="text-center py-8">
                        <div className="inline-block">
                          <div className="spinner"></div>
                        </div>
                        <p className="mt-4">Loading courses...</p>
                      </div>
                    ) : courses.length > 0 ? (
                      <div className="grid grid-cols-3 gap-4">
                        {courses.map((course) => (
                          <CourseCard
                            key={course.id}
                            course={course}
                            onEnrollClick={handleCourseEnrollClick}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-lg text-gray-600">
                          No courses available at the moment. Please check back later!
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* About Section */}
                <section id="about" className="section">
                  <About user={user} />
                </section>

                {/* Features Section */}
                <section className="section bg-gray">
                  <div className="container">
                    <h2 className="section__title">Why Choose Us</h2>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="feature">
                        <div className="feature-icon">✓</div>
                        <h3>Learn at your pace</h3>
                        <p>Access course content anytime, anywhere</p>
                      </div>
                      <div className="feature">
                        <div className="feature-icon">📜</div>
                        <h3>Get certificates</h3>
                        <p>Earn recognized certificates upon completion</p>
                      </div>
                      <div className="feature">
                        <div className="feature-icon">📝</div>
                        <h3>Interactive practice</h3>
                        <p>Learn through hands-on coding exercises</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* CTA Section */}
                <section className="section bg-primary">
                  <div className="container text-center">
                    <h2 className="cta-title">Ready to level up your skills?</h2>
                    <p className="cta-subtitle">
                      Join thousands of students learning today
                    </p>
                    <button
                      className="btn btn--warning btn--lg"
                      onClick={() => {
                        if (user) {
                          scrollToCourses();
                        } else {
                          navigate("/login");
                        }
                      }}
                    >
                      {user ? "Explore Courses" : "Join Now"}
                    </button>
                  </div>
                </section>

                {/* Footer */}
                <Footer />
              </>
            }
          />

          {/* ==================== 404 FALLBACK ==================== */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* ==================== LOGIN MODAL ==================== */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
              <h2>Login Required</h2>
              <p>
                You need to create an account or login to enroll in this course.
              </p>
              <div className="modal-buttons">
                <button
                  className="btn btn--warning"
                  onClick={handleLoginRedirect}
                >
                  Go to Login
                </button>
                <button
                  className="btn btn--secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

// --- Final App with Correct Provider Order ---
const App: FC = () => (
  // AuthProvider MUST be first (initializes token & user from localStorage)
  <AuthProvider>
    {/* UserProvider depends on AuthContext */}
    <UserProvider>
      {/* AppInitializer waits for both contexts to load */}
      <AppInitializer />
    </UserProvider>
  </AuthProvider>
);

export default App;
