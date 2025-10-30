// src/components/LoginForm.tsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";

const API_BASE_URL =
  process.env.REACT_APP_API_URL?.replace(/\/$/, "") || "http://localhost:5000/api";

const LoginForm: React.FC = () => {
  const { user, login, register, verifyOtp, resendOtp, setAuthData, loginWithGoogle, loginWithGithub } = useAuth();
  const navigate = useNavigate();

  const [isNewUser, setIsNewUser] = useState(false);
  const [step, setStep] = useState<"credentials" | "otp" | "reset">("credentials");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const [emailValid, setEmailValid] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [shake, setShake] = useState(false);
  const [confirmShake, setConfirmShake] = useState(false);

  // Resend OTP timer
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // -------- VALIDATION --------
  useEffect(() => {
    setEmailValid(/\S+@\S+\.\S+/.test(email));
    setPasswordValid(password.length >= 6);
    if (isNewUser) setPasswordsMatch(password === confirmPassword);
  }, [email, password, confirmPassword, isNewUser]);

  // -------- RESEND TIMER --------
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (resendTimer === 0 && step === "otp") {
      setCanResend(true);
    }
  }, [resendTimer, step]);

  const handleShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleConfirmShake = () => {
    setConfirmShake(true);
    setTimeout(() => setConfirmShake(false), 500);
  };

  // -------- REDIRECT AFTER LOGIN --------
  useEffect(() => {
    if (!user) return;
    if (user.role === "admin") navigate("/admin", { replace: true });
    else navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  // -------- AUTH HANDLERS --------
  const handleSubmit = async () => {
    if (!emailValid || !passwordValid || (isNewUser && (!passwordsMatch || !name))) {
      handleShake();
      if (isNewUser && !passwordsMatch) handleConfirmShake();
      if (isNewUser && !name) toast.error("Enter your name");
      return toast.error("Enter valid details");
    }

    setLoading(true);
    try {
      if (isNewUser) {
        console.log("Registering new user...");
        const otpSent = await register({ name, email, password });
        if (!otpSent) throw new Error("Signup failed");

        console.log("Sending OTP to email:", email);
        setStep("otp");
        setResendTimer(30);
        setCanResend(false);
        toast.success("OTP sent to your email!");
      } else {
        console.log("Logging in existing user...");
        const authUser = await login({ email, password });
        if (!authUser) throw new Error("Invalid credentials");
        toast.success("Logged in successfully!");
      }
    } catch (err: any) {
      console.error("Signup/Login error:", err);
      handleShake();
      toast.error(err.message || (isNewUser ? "Signup failed" : "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      handleShake();
      return toast.error("Enter OTP");
    }

    setLoading(true);
    try {
      console.log("Verifying OTP for:", email, "OTP:", otp);
      const authUser = await verifyOtp(email, otp);
      if (!authUser) throw new Error("OTP verification failed");

      toast.success("Account created and logged in!");
    } catch (err: any) {
      console.error("OTP verification error:", err);
      handleShake();
      toast.error(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || resendTimer > 0) return;

    setLoading(true);
    try {
      const success = await resendOtp(email);
      if (!success) throw new Error("Failed to resend OTP");

      toast.success("OTP resent successfully!");
      setResendTimer(30);
      setCanResend(false);
      setOtp("");
    } catch (err: any) {
      console.error("Resend OTP error:", err);
      toast.error(err.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const sendResetLink = async () => {
    if (!emailValid) {
      handleShake();
      return toast.error("Enter a valid email");
    }

    setLoading(true);
    try {
      console.log("Sending reset link to:", email);
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to send reset link");
      await res.json();
      toast.success("Reset link sent! Check your email");
      setStep("credentials");
    } catch (err: any) {
      console.error("Reset link error:", err);
      handleShake();
      toast.error(err.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  const resetFields = () => {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setOtp("");
    setResendTimer(0);
    setCanResend(false);
  };

  const handleGoHome = () => {
    navigate("/", { replace: true });
  };

  // -------- JSX --------
  return (
    <div className="login-wrapper" ref={wrapperRef}>
      <div className="login-card" ref={cardRef}>
        {/* Close/Home Button */}
        <button className="login-close-btn" onClick={handleGoHome} title="Go to Home">
          ✕
        </button>

        <h2 className="login-title">
          {isNewUser ? "Create Account" : step === "reset" ? "Reset Password" : "Welcome Back"}
        </h2>

        {/* Toggle Buttons / Back Button */}
        {step !== "reset" && step !== "otp" ? (
          <div className="toggle-buttons">
            <button
              className={`toggle-btn ${!isNewUser ? "active" : ""}`}
              onClick={() => {
                setIsNewUser(false);
                setStep("credentials");
                resetFields();
              }}
            >
              Existing User
            </button>
            <button
              className={`toggle-btn ${isNewUser ? "active" : ""}`}
              onClick={() => {
                setIsNewUser(true);
                setStep("credentials");
                resetFields();
              }}
            >
              New User
            </button>
          </div>
        ) : step === "reset" ? (
          <div className="centered-button">
            <button className="submit-btn" onClick={() => setStep("credentials")}>
              Back to Login
            </button>
          </div>
        ) : null}

        {/* Credentials Form */}
        {step === "credentials" && (
          <div className={`login-form ${shake ? "shake" : ""}`}>
            {isNewUser && (
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`input-field ${name === "" ? "error" : ""}`}
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`input-field ${email && !emailValid ? "error" : ""}`}
            />
            {email && !emailValid && <p className="error-text">Enter a valid email</p>}
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`input-field ${password && !passwordValid ? "error" : ""}`}
            />
            {password && !passwordValid && <p className="error-text">Password must be ≥ 6 characters</p>}
            {isNewUser && (
              <>
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`input-field ${confirmPassword && !passwordsMatch ? "error shake" : ""}`}
                />
                {confirmPassword && !passwordsMatch && <p className="error-text">Passwords do not match</p>}
              </>
            )}
            <button
              className="submit-btn big-btn"
              onClick={handleSubmit}
              disabled={loading || !emailValid || !passwordValid || (isNewUser && (!passwordsMatch || !name))}
            >
              {loading ? "Processing..." : isNewUser ? "Sign Up" : "Login"}
            </button>
            {!isNewUser && (
              <p className="forgot-password" onClick={() => setStep("reset")}>
                Forgot Password?
              </p>
            )}
          </div>
        )}

        {/* OTP Form */}
        {step === "otp" && (
          <div className="login-form fade-in">
            <p className="otp-instruction">
              Enter the 6-digit OTP sent to <strong>{email}</strong>
            </p>

            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="input-field"
              maxLength={6}
            />

            <button className="submit-btn big-btn" onClick={handleVerifyOtp} disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            {/* Resend OTP Section */}
            <div className="resend-otp-section">
              {resendTimer > 0 ? (
                <p className="resend-timer">
                  Resend OTP in <strong>{resendTimer}s</strong>
                </p>
              ) : (
                <button
                  className="submit-btn resend-btn"
                  onClick={handleResendOtp}
                  disabled={loading || !canResend}
                >
                  {loading ? "Sending..." : "Resend OTP"}
                </button>
              )}
            </div>

            <button
              className="submit-btn back-btn"
              onClick={() => {
                setStep("credentials");
                resetFields();
              }}
            >
              Back to Signup
            </button>
          </div>
        )}

        {/* Reset Password Form */}
        {step === "reset" && (
          <div className="login-form fade-in">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`input-field ${email && !emailValid ? "error" : ""}`}
            />
            {email && !emailValid && <p className="error-text">Enter a valid email</p>}
            <button className="submit-btn big-btn" onClick={sendResetLink} disabled={loading || !emailValid}>
              {loading ? "Processing..." : "Send Reset Link"}
            </button>
          </div>
        )}

        {/* Social Login */}
        {step === "credentials" && (
          <div className="social-login">
            <button onClick={loginWithGoogle} disabled={loading} className="btn--google big-btn gradient-hover">
              <FcGoogle size={24} /> Continue with Google
            </button>
            <button onClick={loginWithGithub} disabled={loading} className="btn--github big-btn gradient-hover">
              <FaGithub size={24} /> Continue with GitHub
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginForm;
