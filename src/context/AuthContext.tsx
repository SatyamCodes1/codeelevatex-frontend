// src/context/AuthContext.tsx
import React, { createContext, useContext, ReactNode, useState } from "react";
import { auth } from "../firebase";
import {
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  User as FirebaseUser,
} from "firebase/auth";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  avatar?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (credentials: { email: string; password: string }) => Promise<AuthUser | null>;
  register: (credentials: { name: string; email: string; password: string }) => Promise<boolean>;
  verifyOtp: (email: string, otp: string) => Promise<AuthUser | null>;
  resendOtp: (email: string) => Promise<boolean>;
  logout: () => void;
  setAuthData: (user: AuthUser, token: string) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();
githubProvider.addScope("user:email");

// 🌍 Define global API base URL (auto switches between local & deployed)
const API_BASE_URL =
  process.env.REACT_APP_API_URL?.replace(/\/$/, "") || "http://localhost:5000/api";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("authUser");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("authToken"));
  const [loading, setLoading] = useState(false);

  // ----------------- Helper -----------------
  const setAuthData = (authUser: AuthUser, authToken: string) => {
    console.log("Setting auth data:", authUser, authToken);
    setUser(authUser);
    setToken(authToken);
    localStorage.setItem("authUser", JSON.stringify(authUser));
    localStorage.setItem("authToken", authToken);
  };

  // ----------------- Email/Password Login -----------------
  const login = async ({ email, password }: { email: string; password: string }) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      console.log("Login response:", data);

      if (!res.ok) throw new Error(data.message || "Invalid credentials");

      const authUser: AuthUser = {
        id: data.user.id ?? data.user._id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role || "user",
        avatar: data.user.avatar,
      };
      setAuthData(authUser, data.token);
      return authUser;
    } catch (err) {
      console.error("Login error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ----------------- Registration (send OTP only) -----------------
  const register = async ({ name, email, password }: { name: string; email: string; password: string }) => {
    setLoading(true);
    try {
      console.log("Registering new user...", email);
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      console.log("Register response:", data);

      if (!res.ok) {
        throw new Error(data.message || "Registration failed");
      }

      return true;
    } catch (err) {
      console.error("Register error:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ----------------- Verify OTP -----------------
  const verifyOtp = async (email: string, otp: string) => {
    setLoading(true);
    try {
      console.log("Verifying OTP for:", email, otp);
      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const responseData = await res.json();
      console.log("OTP verification response:", responseData);

      if (!res.ok) throw new Error(responseData.message || "Invalid OTP");

      const userData = responseData.data;
      const authUser: AuthUser = {
        id: userData.id ?? userData._id ?? Date.now().toString(),
        name: userData.name,
        email: userData.email,
        role: userData.role || "user",
        avatar: userData.avatar,
      };
      setAuthData(authUser, responseData.token);
      return authUser;
    } catch (err: any) {
      console.error("OTP verify error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ----------------- Resend OTP -----------------
  const resendOtp = async (email: string): Promise<boolean> => {
    setLoading(true);
    try {
      console.log("Resending OTP to:", email);
      const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      console.log("Resend OTP response:", data);

      if (!res.ok) throw new Error(data.message || "Failed to resend OTP");

      return true;
    } catch (err) {
      console.error("Resend OTP error:", err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ----------------- Logout -----------------
  const logout = () => {
    console.log("Logging out user");
    setUser(null);
    setToken(null);
    localStorage.removeItem("authUser");
    localStorage.removeItem("authToken");
  };

  // ----------------- Social Login -----------------
  const handleSocialLogin = async (provider: GoogleAuthProvider | GithubAuthProvider) => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser: FirebaseUser = result.user;

      const userEmail = firebaseUser.email || `${firebaseUser.uid}@social.fake`;
      const userName = firebaseUser.displayName || "User";

      const res = await fetch(`${API_BASE_URL}/auth/social-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          name: userName,
          avatar: firebaseUser.photoURL || "",
          provider: provider instanceof GoogleAuthProvider ? "google" : "github",
          providerId: firebaseUser.uid,
        }),
      });
      const data = await res.json();
      console.log("Social login response:", data);

      if (!res.ok) throw new Error(data.message || "Social login failed");

      const authUser: AuthUser = {
        id: data.user.id ?? data.user._id ?? Date.now().toString(),
        name: data.user.name,
        email: data.user.email,
        role: data.user.role || "user",
        avatar: data.user.avatar,
      };
      setAuthData(authUser, data.token);
    } catch (err) {
      console.error("Social login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = () => handleSocialLogin(googleProvider);
  const loginWithGithub = () => handleSocialLogin(githubProvider);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        verifyOtp,
        resendOtp,
        logout,
        setAuthData,
        loginWithGoogle,
        loginWithGithub,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export { AuthContext };
