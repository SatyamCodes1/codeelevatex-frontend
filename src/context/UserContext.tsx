import React, { createContext, useContext, useEffect, useState, ReactNode, FC } from "react";
import { useAuth } from "./AuthContext";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  avatar?: string;
  isVerified?: boolean;
  lastLogin?: string;
  googleId?: string;
  githubId?: string;
  [key: string]: any;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
}

export interface UserContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (name: string, email: string, password: string, role?: string) => Promise<AuthResponse>;
  logout: () => void;
  setAuthData: (user: User, token: string) => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
}

interface UserProviderProps {
  children: ReactNode;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: FC<UserProviderProps> = ({ children }) => {
  const authContext = useAuth();
  const [loading, setLoading] = useState<boolean>(true);

  const API_BASE =
    process.env.REACT_APP_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

  // Sync with AuthContext
  useEffect(() => {
    // Wait for AuthContext to finish loading
    if (!authContext.loading) {
      setLoading(false);
    }
  }, [authContext.loading]);

  // Convert AuthUser to User format
  const user: User | null = authContext.user
    ? {
        id: authContext.user.id,
        name: authContext.user.name,
        email: authContext.user.email,
        role: authContext.user.role,
        avatar: authContext.user.avatar,
      }
    : null;

  const token = authContext.token;

  // Store user & token (delegates to AuthContext)
  const setAuthData = (user: User, token: string) => {
    const normalizedUser = {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    };
    authContext.setAuthData(normalizedUser, token);
  };

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const result = await authContext.login({ email, password });
      if (result) {
        return { success: true, user: result as any };
      } else {
        return { success: false, message: "Login failed" };
      }
    } catch (err) {
      console.error("Login error:", err);
      return { success: false, message: "Login failed. Please try again." };
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: string = "user"
  ): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();

      if (response.ok) {
        setAuthData(data.user, data.token);
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      console.error("Registration error:", err);
      return { success: false, message: "Registration failed. Please try again." };
    }
  };

  const logout = () => {
    authContext.logout();
  };

  const value: UserContextType = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    setAuthData,
    isLoggedIn: !!user,
    isAdmin: user?.role === "admin",
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export { UserContext };
