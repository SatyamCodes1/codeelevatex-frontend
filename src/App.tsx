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

// --- AppInitializer ---
const AppInitializer: FC = () => {
  const { loading } = useUser();
  if (loading) {
    return (
      <div className="spinner-overlay">
        <div className="spinner"></div>
        <p className="spinner-text">Loading user info...</p>
      </div>
    );
  }
  return (
    <CourseProvider>
      <AppContent />
    </CourseProvider>
  );
};

// --- AppContent ---
const AppContent: FC = () => {
  const { user } = useAuth();
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

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const apiUrl = process.env.REACT_APP_API_URL?.replace(/\/$/, "") || "http://localhost:5000/api";
        const token = localStorage.getItem("authToken");

        const res = await fetch(`${apiUrl}/courses`, {
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });

        const data = await res.json();
        const coursesArray: APICourse[] =
          Array.isArray(data) ? data :
          Array.isArray(data.courses) ? data.courses :
          Array.isArray(data.data) ? data.data : [];

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
      } catch (err) {
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, []);

  const handleCourseEnrollClick = (courseId: string) => {
    if (!user) {
      setPendingCourseId(courseId);
      setShowModal(true);
    } else if (enrolledCourseIds.includes(courseId)) {
      navigate(`/course/${courseId}`);
    } else {
      navigate(`/payment/${courseId}`);
    }
  };

  const handleLoginRedirect = () => {
    setShowModal(false);
    navigate("/login");
  };

  const scrollToCourses = () => {
    document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Header />
      <main>
        <Routes>
          {/* Login */}
          <Route
            path="/login"
            element={!user ? <div className="container"><LoginForm /></div> : (user.role === "admin" ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />)}
          />
          
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard courses={courses} /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminCourses /></ProtectedRoute>} />
          <Route path="/payment/:id" element={<ProtectedRoute><RazorpayPaymentPage courses={courses} /></ProtectedRoute>} />
          <Route path="/course/:id" element={<ProtectedRoute><CoursePage /></ProtectedRoute>} />

          {/* Public pages */}
          <Route path="/community" element={<Community />} />
          <Route path="/contact" element={<Contact />} />

          {/* Home page */}
          <Route path="/" element={
            <>
              <Hero onExplore={scrollToCourses} />
              <section id="courses" className="section bg-gray">
                <div className="container">
                  <h2 className="section__title">Our Courses</h2>
                  {loadingCourses ? <p>Loading courses...</p> : (
                    <div className="grid grid-cols-3 gap-4">
                      {courses.length ? courses.map(c => <CourseCard key={c.id} course={c} onEnrollClick={handleCourseEnrollClick} />) : <p>No courses available</p>}
                    </div>
                  )}
                </div>
              </section>
              <section id="about" className="section"><About user={user} /></section>
              <section className="section bg-gray">
                <div className="container">
                  <h2 className="section__title">Why Choose Us</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="feature"><div className="feature-icon">✓</div><h3>Learn at your pace</h3></div>
                    <div className="feature"><div className="feature-icon">📜</div><h3>Get certificates</h3></div>
                    <div className="feature"><div className="feature-icon">📝</div><h3>Interactive practice</h3></div>
                  </div>
                </div>
              </section>
              <section className="section bg-primary">
                <div className="container text-center">
                  <h2 className="cta-title">Ready to level up your skills?</h2>
                  <button className="btn btn--warning btn--lg" onClick={() => (user ? scrollToCourses() : navigate("/login"))}>Join Now</button>
                </div>
              </section>
              <Footer />
            </>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Login Required</h2>
              <p>You need to login before enrolling in this course.</p>
              <div className="modal-buttons">
                <button className="btn btn--warning" onClick={handleLoginRedirect}>Go to Login</button>
                <button className="btn btn--secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

// --- Final App ---
const App: FC = () => (
  <UserProvider>
    <AuthProvider>
      <AppInitializer />
    </AuthProvider>
  </UserProvider>
);

export default App;
