import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useCourse } from "../context/CourseContext";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

const { jsPDF } = require("jspdf");

interface CourseType {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  progress?: number; // 0-100
}

interface DashboardProps {
  courses: CourseType[];
}

const Dashboard: React.FC<DashboardProps> = ({ courses }) => {
  const { user } = useAuth();
  const { enrolledCourseIds, enrollmentsLoaded } = useCourse();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"enrolled" | "completed" | "certificates">("enrolled");
  const [enrolledCourses, setEnrolledCourses] = useState<CourseType[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<CourseType | null>(null);

  // Persist selected certificate across reloads
  useEffect(() => {
    const savedId = localStorage.getItem("selectedCertificateId");
    if (savedId && enrolledCourses.length) {
      const course = enrolledCourses.find((c) => c.id === savedId);
      if (course) setSelectedCertificate(course);
    }
  }, [enrolledCourses]);

  // Load enrolled courses
  useEffect(() => {
    if (enrollmentsLoaded) {
      const userCourses = courses
        .filter((course) => enrolledCourseIds.includes(course.id))
        .map((course) => ({ ...course, progress: course.progress ?? 0 }));
      setEnrolledCourses(userCourses);
    }
  }, [courses, enrolledCourseIds, enrollmentsLoaded]);

  // Generate unique certificate ID
  const generateCertificateID = (courseId: string) => {
    const storedId = localStorage.getItem(`certId-${courseId}`);
    if (storedId) return storedId;

    const timestamp = Date.now().toString(36);
    const random = Math.floor(Math.random() * 1e6).toString(36);
    const newId = `CEX-${courseId.slice(0, 4).toUpperCase()}-${timestamp}-${random}`;
    localStorage.setItem(`certId-${courseId}`, newId);
    return newId;
  };

  // Base64 logo
  const codeElevateLogo =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABf0lEQVR4nO3aMQ7CMAxE0Xk/0P58Xk5FwmReRNWlcuq2MwHRfBeBkT2zX+u4r1iIAAAAAAAAAAC8v6u7Pr/Sb78+L6q59+wMrqNdxJ5GjYwbJd5GTxLR9FZ7eOAwJnlSZLClzKiRzM9bslS58pEk3t0yRyy5aFOu5FkPXaEvl+GnR+UxA2d6pZVvJpU/fL3nXbQJ0vj3uGHptZ+k7xCjMhzWex9lYmRIpmMJqFmR4lwzSbk5Z4a6c4eMGH7k6Z94J/7EZn5t83fMGpKZbNP1cJbt/RV4uIkkSZJi2s9d7OCnEoqZIk2VmySXJ1+JSNn2+Zb2bNnH6gFz1cC+1s7M5/2vC/AAAAAAAAAIBrB1vImY5IkB5kAAAAASUVORK5CYII=";

  // Generate PDF certificate
  const handleClaimCertificate = (course: CourseType) => {
    if ((course.progress ?? 0) < 100) return;

    const doc = new jsPDF("landscape", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Background
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Border
    doc.setDrawColor(50, 50, 50);
    doc.setLineWidth(2);
    doc.rect(30, 30, pageWidth - 60, pageHeight - 60);

    // Watermark
    doc.setFontSize(120);
    doc.setTextColor(200, 200, 200);
    doc.text("🎓", pageWidth / 2 - 40, pageHeight / 2 + 40, { align: "center" });

    // Logo top center
    const imgWidth = 100;
    const imgHeight = 100;
    doc.addImage(codeElevateLogo, "PNG", pageWidth / 2 - imgWidth / 2, 40, imgWidth, imgHeight);

    // Gradient header
    const gradient = doc.context2d.createLinearGradient(30, 160, pageWidth - 30, 160);
    gradient.addColorStop(0, "#6a11cb");
    gradient.addColorStop(1, "#2575fc");
    doc.context2d.fillStyle = gradient;
    doc.context2d.fillRect(30, 160, pageWidth - 60, 60);

    // Header text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(32);
    doc.setTextColor(255, 255, 255);
    doc.text("Certificate of Completion", pageWidth / 2, 190, { align: "center" });

    // Recipient
    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("This is to certify that", pageWidth / 2, 260, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text(user?.name || "Anonymous Learner", pageWidth / 2, 290, { align: "center" });

    // Course info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.text("has successfully completed the course", pageWidth / 2, 320, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(course.title, pageWidth / 2, 350, { align: "center" });

    // Certificate ID & date
    const certID = generateCertificateID(course.id);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Certificate ID: ${certID}`, pageWidth / 2, 380, { align: "center" });
    doc.text(`Issued on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 400, { align: "center" });

    // Gold circular stamp in PDF
    const stampRadius = 50;
    const stampCenterX = pageWidth - 100;
    const stampCenterY = pageHeight - 100;

    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(3);
    doc.circle(stampCenterX, stampCenterY, stampRadius, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(212, 175, 55);
    doc.text("CodeElevateX", stampCenterX, stampCenterY + 5, { align: "center" });

    // Signature
    doc.setDrawColor(0);
    doc.setLineWidth(1);
    doc.line(pageWidth / 2 - 80, pageHeight - 100, pageWidth / 2 + 80, pageHeight - 100);
    doc.setFontSize(14);
    doc.text("Authorized Signature", pageWidth / 2, pageHeight - 80, { align: "center" });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(14);
    doc.text("CodeElevateX Learning Platform", pageWidth / 2, pageHeight - 40, { align: "center" });

    doc.save(`${course.title}_certificate.pdf`);
  };

  if (!enrollmentsLoaded) {
    return (
      <div className="dashboard dashboard-loading">
        <div>
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const completedCourses = enrolledCourses.filter((c) => (c.progress ?? 0) === 100);

  return (
    <div className="dashboard">
      <div className="dashboard__container">
        {/* Welcome */}
        <div className="dashboard__welcome">
          <h1>Hey {user?.name}! 👋</h1>
          <p>Keep pushing your learning journey 🚀</p>
        </div>

        {/* Tabs */}
        <div className="dashboard__stats-tabs">
          <div className={`dashboard__card-tab ${activeTab === "enrolled" ? "active" : ""}`} onClick={() => setActiveTab("enrolled")}>
            <div className="icon icon--blue">📚</div>
            <p>Enrolled</p>
            <span>{enrolledCourses.length}</span>
          </div>
          <div className={`dashboard__card-tab ${activeTab === "completed" ? "active" : ""}`} onClick={() => setActiveTab("completed")}>
            <div className="icon icon--green">🎓</div>
            <p>Completed</p>
            <span>{completedCourses.length}</span>
          </div>
          <div className={`dashboard__card-tab ${activeTab === "certificates" ? "active" : ""}`} onClick={() => setActiveTab("certificates")}>
            <div className="icon icon--purple">🏅</div>
            <p>Certificates</p>
            <span>{enrolledCourses.length}</span>
          </div>
        </div>

        {/* Enrolled */}
        {activeTab === "enrolled" && (
          <div className="dashboard__courses">
            <h2>Enrolled Courses</h2>
            {enrolledCourses.length ? (
              <div className="course-grid">
                {enrolledCourses.map((course) => (
                  <div key={course.id} className="course-card">
                    <div className="course-icon">{course.icon || "📘"}</div>
                    <h3>{course.title}</h3>
                    <p>{course.description || "No description available."}</p>
                    <div className="course-progress">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${course.progress ?? 0}%` }}></div>
                      </div>
                      <span>{course.progress ?? 0}%</span>
                    </div>
                    <button className="btn-resume" onClick={() => navigate(`/course/${course.id}`)}>Resume</button>
                  </div>
                ))}
              </div>
            ) : <p>No enrolled courses yet 😔</p>}
          </div>
        )}

        {/* Completed */}
        {activeTab === "completed" && (
          <div className="dashboard__courses">
            <h2>Completed Courses</h2>
            {completedCourses.length ? (
              <div className="course-grid">
                {completedCourses.map((course) => (
                  <div key={course.id} className="course-card">
                    <div className="course-icon">🏆</div>
                    <h3>{course.title}</h3>
                    <p>You nailed this course! 💪</p>
                    <button className="btn-resume" onClick={() => navigate(`/course/${course.id}`)}>View Course</button>
                  </div>
                ))}
              </div>
            ) : <p>No completed courses yet 👀</p>}
          </div>
        )}

        {/* Certificates */}
        {activeTab === "certificates" && (
          <div className="dashboard__certificates">
            <h2>Certificates</h2>
            {selectedCertificate ? (
        <div
  className="certificate-details"
  style={{
    backgroundColor: "#e6d4d4ff",
    backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAClElEQVR4nO2aPU7DUBSGv1E7AQTgAI7AA0AApABzQB8QAeQAKwAJEASdAAl0AHKADJAAbc3Zb5N7p5bfmk9G8n1exbC4Vzc3N6O8A9R99LrVwClTRtljGBe1WyFNCt2u0K5jq9WSbB3xUoJbZ1mSLS0bQ67aNANp1YzRlmrVt0u2mivEKyT2XTVmiSPj9tq+iL2nM0qUvdKl8wtRnbwlfSvSk3n0gpU5U/+pXU1msN3j2u4aY03x+uik/3UZcNwnq8F1I+N99Zp0bxNpfsRzDg7P2ujYc7gjv2fgJjX25qgC+MW0tdQ2+ZotNbcJ3/hcMqYd+0Cua+F4+JQ2vJgSAAAAAElFTkSuQmCC")`,
    backgroundRepeat: "repeat",
    backgroundSize: "50px 50px", // adjust pattern size
    minHeight: "500px", // ensure container is tall enough
    padding: "2rem",
    borderRadius: "10px",
    border: "2px solid #3b82f6",
    position: "relative",
  }}
>
                <div className="certificate-watermark">🎓</div>
                <img src={codeElevateLogo} alt="CodeElevateX" className="certificate-logo" />
                <div className="certificate-stamp-container">
                  <span className="certificate-stamp">CodeElevateX</span>
                </div>
                <h3>Certificate of Completion</h3>
                <p>This certifies that</p>
                <h3>{user?.name || "Anonymous Learner"}</h3>
                <p>has successfully completed the course</p>
                <h3>{selectedCertificate.title}</h3>
                <p>Certificate ID: {generateCertificateID(selectedCertificate.id)}</p>
                <p>Issued on: {new Date().toLocaleDateString()}</p>
                <p><em>CodeElevateX Learning Platform</em></p>
                <button className="btn-claim" disabled={(selectedCertificate.progress ?? 0) < 100} onClick={() => handleClaimCertificate(selectedCertificate)}>Claim PDF</button>
                <button className="btn-back" onClick={() => { setSelectedCertificate(null); localStorage.removeItem("selectedCertificateId"); }}>← Back</button>
              </div>
            ) : (
              <div className="certificate-grid">
                {enrolledCourses.map((course) => (
                  <div
                    key={course.id}
                    className={`certificate-card ${course.progress === 100 ? "completed" : "in-progress"}`}
                    onClick={() => { setSelectedCertificate(course); localStorage.setItem("selectedCertificateId", course.id); }}
                  >
                    <div className="certificate-icon">🎓</div>
                    <h3>{course.title}</h3>
                    <p>{course.progress ?? 0}% {(course.progress ?? 0) < 100 ? "(Complete to claim PDF)" : "- Tap to preview & claim"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="dashboard__quick-actions">
          <h2>Quick Actions</h2>
          <div className="dashboard__quick-actions-grid">
            <div className="quick-action-card" onClick={() => navigate("/")}>
              <span>🔍</span>
              <div>
                <h3>Explore Courses</h3>
                <p>Find something new to learn</p>
              </div>
            </div>
            <div className="quick-action-card" onClick={() => navigate("/community")}>
              <span>👥</span>
              <div>
                <h3>Join Community</h3>
                <p>Connect with other learners</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 