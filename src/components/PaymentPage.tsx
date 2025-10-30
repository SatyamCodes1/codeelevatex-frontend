import React, { FC, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useCourse } from "../context/CourseContext";
import { CourseType } from "../types";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentPageProps {
  courses: CourseType[];
}

const PaymentPage: FC<PaymentPageProps> = ({ courses }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userContext = useUser();
  const { enrollInCourse, loading: courseLoading, loadEnrollments } = useCourse();

  const courseId = id || "";
  const STORAGE_KEY = "lastCourse";

  // ✅ FIXED: API base URL
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [course, setCourse] = useState<CourseType | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "failed">("idle");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [authUser, setAuthUser] = useState<any>(null);

  // Get user from localStorage (your app uses 'authUser' not 'user')
  useEffect(() => {
    const storedUser = localStorage.getItem("authUser");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setAuthUser(parsedUser);
        console.log("✅ Found user in localStorage.authUser:", parsedUser);
      } catch (err) {
        console.error("Error parsing authUser:", err);
      }
    }
  }, []);

  const user = userContext?.user || authUser;

  // Check if user is already enrolled
  useEffect(() => {
    if (user?.enrolledCourses?.includes(courseId)) {
      navigate(`/course/${courseId}`, { replace: true });
    }
  }, [user, courseId, navigate]);

  // Load course data
  useEffect(() => {
    const loadCourse = async () => {
      if (!courseId) return;
      setLoading(true);
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const cachedCourse = JSON.parse(cached) as CourseType;
          if (cachedCourse._id === courseId || cachedCourse.id === courseId) {
            setCourse(cachedCourse);
            setLoading(false);
            return;
          }
        }
        let foundCourse = courses.find((c) => c._id === courseId || c.id === courseId) ?? null;
        if (!foundCourse) {
          // ✅ FIXED: Added /api prefix
          const res = await fetch(`${API_BASE}/api/courses/${courseId}`);
          if (!res.ok) throw new Error("Course not found");
          const data = await res.json();
          foundCourse = {
            _id: data.course._id,
            id: data.course._id,
            title: data.course.title,
            description: data.course.description || "No description provided",
            icon: data.course.icon || "📚",
            price: data.course.price,
          };
        }
        setCourse(foundCourse);
        if (foundCourse) localStorage.setItem(STORAGE_KEY, JSON.stringify(foundCourse));
      } catch (err: any) {
        console.error("[PaymentPage] loadCourse error:", err);
        setStatus("failed");
        setErrorMessage(err.message || "Course not found");
      } finally {
        setLoading(false);
      }
    };
    loadCourse();
  }, [courses, courseId, API_BASE]);

  const handlePayment = async () => {
    if (!course) return;

    // Get userId from user object (supports multiple property names)
    const userId = user?._id || user?.id;

    console.log("Payment handler - user:", user);
    console.log("Payment handler - userId:", userId);

    if (!userId) {
      console.error("No userId found. User object:", user);
      setStatus("failed");
      setErrorMessage("Unable to identify user. Please refresh the page.");
      return;
    }

    setStatus("processing");
    setErrorMessage("");

    if (!window.Razorpay) {
      setStatus("failed");
      setErrorMessage("Payment system not loaded. Please refresh.");
      return;
    }

    try {
      console.log("Creating Razorpay order with userId:", userId);

      // ✅ FIXED: Added /api prefix
      const res = await fetch(`${API_BASE}/api/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: course.price,
          currency: "INR",
          userId: userId,
          courseId: course._id
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create payment order");
      }

      const orderData = await res.json();
      console.log("✅ Razorpay order created:", orderData.id);

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "CodeElevateX",
        description: course.title,
        order_id: orderData.id,
        prefill: {
          name: user?.name || "",
          email: user?.email || ""
        },
        handler: async (response: any) => {
          console.log("✅ Payment successful, verifying...");
          try {
            // ✅ FIXED: Added /api prefix
            const verifyRes = await fetch(`${API_BASE}/api/payment/verify-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: userId,
                courseId: course._id
              }),
            });

            if (!verifyRes.ok) {
              const errorData = await verifyRes.json();
              throw new Error(errorData.error || "Payment verification failed");
            }

            const result = await verifyRes.json();
            console.log("✅ Payment verification result:", result);

            if (result.success) {
              console.log("🎉 Payment verified! Emails sent by backend.");

              try {
                const enrollmentResult = await enrollInCourse(course._id, {
                  payment: result,
                  amount: course.price,
                  paymentMethod: "razorpay",
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                });

                if (!enrollmentResult.success) {
                  console.warn("Frontend enrollment failed:", enrollmentResult.message);
                } else {
                  console.log("✅ Frontend enrollment successful");
                  if (loadEnrollments) await loadEnrollments();
                }
              } catch (enrollErr) {
                console.warn("Frontend enrollment error:", enrollErr);
              }

              setStatus("success");
              localStorage.removeItem(STORAGE_KEY);

              setTimeout(() => {
                navigate(`/course/${course._id}`, { replace: true });
              }, 2000);
            } else {
              setStatus("failed");
              setErrorMessage(result.message || "Payment verification failed.");
            }
          } catch (err: any) {
            console.error("❌ Payment verification error:", err);
            setStatus("failed");
            setErrorMessage(err.message || "Payment verification failed. Contact support.");
          }
        },
        modal: {
          ondismiss: () => {
            console.log("⚠️ Payment modal dismissed by user");
            setStatus("idle");
            setErrorMessage("Payment was cancelled.");
          },
        },
        theme: {
          color: "#667eea"
        }
      };

      console.log("🚀 Opening Razorpay checkout...");
      new window.Razorpay(options).open();
    } catch (err: any) {
      console.error("❌ Payment initiation error:", err);
      setStatus("failed");
      setErrorMessage(err.message || "Failed to initiate payment. Try again.");
    }
  };

  if (loading) {
    return (
      <div className="payment-container">
        <div className="payment-card">
          <div className="text-center">
            <div className="spinner"></div>
            <p style={{ marginTop: "20px" }}>Loading course...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="payment-container">
        <div className="payment-card">
          <h2 className="payment-title">Course not found 😢</h2>
          <p>The course you're looking for doesn't exist.</p>
          <button
            className="payment-btn"
            onClick={() => navigate("/courses")}
            style={{ marginTop: "20px" }}
          >
            Browse Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-container">
      <div className="payment-card">
        {status === "idle" && (
          <>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "48px", marginBottom: "10px" }}>
                {course.icon || "📚"}
              </div>
              <h2 className="payment-title">
                Pay for <span>{course.title}</span>
              </h2>
              {course.description && (
                <p style={{ color: "#666", fontSize: "14px", marginTop: "10px" }}>
                  {course.description}
                </p>
              )}
            </div>

            <div className="payment-input-box">
              <label>Amount</label>
              <input type="text" value={`₹${course.price}`} readOnly />
            </div>

            {user && (
              <div
                style={{
                  background: "#f5f5f5",
                  padding: "15px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  fontSize: "14px",
                }}
              >
                <p style={{ margin: "5px 0", color: "#666" }}>
                  <strong>Name:</strong> {user.name}
                </p>
                <p style={{ margin: "5px 0", color: "#666" }}>
                  <strong>Email:</strong> {user.email}
                </p>
              </div>
            )}

            <button
              className="payment-btn"
              onClick={handlePayment}
              disabled={courseLoading}
            >
              {courseLoading ? "Processing..." : `Pay ₹${course.price}`}
            </button>

            <p className="payment-note">
              🔒 Secure payment powered by Razorpay
            </p>
            <p className="payment-note" style={{ fontSize: "12px", color: "#999" }}>
              You will receive confirmation emails after successful payment
            </p>
          </>
        )}

        {status === "processing" && (
          <div className="text-center">
            <h2 style={{ color: "#667eea" }}>Processing payment...</h2>
            <div className="spinner" style={{ margin: "20px auto" }}></div>
            <p style={{ color: "#666", fontSize: "14px" }}>
              Please complete the payment in the Razorpay window
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <div style={{ fontSize: "64px", marginBottom: "20px" }}>✅</div>
            <h2 className="payment-title" style={{ color: "#4CAF50" }}>
              Payment Successful!
            </h2>
            <p style={{ fontSize: "16px", margin: "15px 0" }}>
              You are now enrolled in <strong>{course.title}</strong>!
            </p>
            <div
              style={{
                background: "#E8F5E9",
                padding: "15px",
                borderRadius: "8px",
                margin: "20px 0",
              }}
            >
              <p style={{ margin: "5px 0", color: "#2E7D32", fontSize: "14px" }}>
                📧 Confirmation emails sent to <strong>{user?.email}</strong>
              </p>
              <p style={{ margin: "5px 0", color: "#666", fontSize: "12px" }}>
                • Payment receipt
              </p>
              <p style={{ margin: "5px 0", color: "#666", fontSize: "12px" }}>
                • Course enrollment details
              </p>
            </div>
            <div className="spinner" style={{ margin: "20px auto" }}></div>
            <p style={{ color: "#999", fontSize: "12px" }}>
              Redirecting to course page...
            </p>
          </div>
        )}

        {status === "failed" && (
          <div className="text-center">
            <div style={{ fontSize: "64px", marginBottom: "20px" }}>❌</div>
            <h2 style={{ color: "#dc3545" }}>Payment Failed</h2>
            <p style={{ margin: "15px 0", color: "#666" }}>
              {errorMessage || "Please try again or contact support."}
            </p>
            <button
              className="payment-btn"
              onClick={handlePayment}
              style={{ marginTop: "20px" }}
            >
              Retry Payment
            </button>
            <button
              className="payment-btn"
              onClick={() => navigate("/courses")}
              style={{
                marginTop: "10px",
                background: "white",
                color: "#667eea",
                border: "2px solid #667eea",
              }}
            >
              Back to Courses
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentPage;
