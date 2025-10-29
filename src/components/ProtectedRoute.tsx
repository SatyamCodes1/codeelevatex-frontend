// src/components/ProtectedRoute.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { user } = useAuth();

  if (!user) {
    // Not logged in
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== "admin") {
    // Non-admin trying to access admin page
    return <Navigate to="/dashboard" replace />;
  }

  // User is allowed
  return <>{children}</>;
};

export default ProtectedRoute;
