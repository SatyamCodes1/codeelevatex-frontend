// src/pages/ResetPassword.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setAuthData } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  const [passwordValid, setPasswordValid] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    setPasswordValid(password.length >= 6);
    setPasswordsMatch(password === confirmPassword);
  }, [password, confirmPassword]);

  const handleShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleResetPassword = async () => {
    if (!passwordValid || !passwordsMatch) {
      handleShake();
      if (!passwordValid) return toast.error("Password must be at least 6 characters");
      if (!passwordsMatch) return toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL?.replace(/\/$/, "") || "http://localhost:5000/api";
      const res =  await fetch(`${apiUrl}/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400) setTokenValid(false);
        throw new Error(data.message || "Failed to reset password");
      }

      toast.success("Password reset successfully! Logging you in...");

      // Auto-login after successful reset
      if (data.token && data.user) {
        setAuthData(
          {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role || "user",
            avatar: data.user.avatar,
          },
          data.token
        );
      }

      setTimeout(() => {
        navigate(data.user.role === "admin" ? "/admin" : "/home", { replace: true });
      }, 1500);
    } catch (err: any) {
      console.error("Reset password error:", err);
      handleShake();
      toast.error(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <h2 className="login-title" style={{ color: "#dc3545" }}>Invalid or Expired Link</h2>
          <div className="login-form">
            <p style={{ textAlign: "center", color: "#666", marginBottom: "20px" }}>
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <button
              className="submit-btn big-btn"
              onClick={() => navigate("/login")}
              style={{ background: "#6c757d" }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2 className="login-title">Reset Your Password</h2>
        <div className={`login-form ${shake ? "shake" : ""}`}>
          <p style={{ textAlign: "center", color: "#666", marginBottom: "20px", fontSize: "14px" }}>
            Enter your new password below
          </p>

          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`input-field ${password && !passwordValid ? "error" : ""}`}
          />
          {password && !passwordValid && (
            <p className="error-text">Password must be ≥ 6 characters</p>
          )}

          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`input-field ${confirmPassword && !passwordsMatch ? "error" : ""}`}
          />
          {confirmPassword && !passwordsMatch && (
            <p className="error-text">Passwords do not match</p>
          )}

          <button
            className="submit-btn big-btn"
            onClick={handleResetPassword}
            disabled={loading || !passwordValid || !passwordsMatch}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          <button
            className="submit-btn"
            onClick={() => navigate("/login")}
            style={{ marginTop: "15px", background: "#6c757d" }}
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
