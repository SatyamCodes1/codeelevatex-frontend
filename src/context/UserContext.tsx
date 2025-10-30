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

<<<<<<< HEAD
  const API_BASE =
    process.env.REACT_APP_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

  // Sync with AuthContext
  useEffect(() => {
    // Wait for AuthContext to finish loading
    if (!authContext.loading) {
=======
  // ✅ Normalize API base (remove any trailing slash)
  const API_BASE =
    process.env.REACT_APP_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

  // 🔁 Restore from localStorage instantly
  useEffect(() => {
    const storedUser = localStorage.getItem("authUser");
    const storedToken = localStorage.getItem("authToken");
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch (err) {
        console.error("Failed to parse stored user:", err);
      }
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => await checkAuthStatus();
    initAuth();
  }, []);

  // ✅ Check if user is authenticated
  const checkAuthStatus = async () => {
    const savedToken = localStorage.getItem("authToken");
    if (!savedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${savedToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();

        const normalizedUser: User = {
          id: data.user._id || data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role || "user",
          avatar: data.user.avatar || "",
          googleId: data.user.googleId,
          githubId: data.user.githubId,
        };

        setUser(normalizedUser);
        setToken(savedToken);
        localStorage.setItem("authUser", JSON.stringify(normalizedUser));
      } else {
        console.warn("Auth check failed, removing invalid token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      setUser(null);
      setToken(null);
    } finally {
>>>>>>> 12a5dc9803189dd39d9bc5fe7ebf237935dc2c6d
      setLoading(false);
    }
  }, [authContext.loading]);

<<<<<<< HEAD
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
=======
  // ✅ Store user + token
>>>>>>> 12a5dc9803189dd39d9bc5fe7ebf237935dc2c6d
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
<<<<<<< HEAD
      const result = await authContext.login({ email, password });
      if (result) {
        return { success: true, user: result as any };
=======
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setAuthData(data.user, data.token);
        return { success: true, user: data.user };
>>>>>>> 12a5dc9803189dd39d9bc5fe7ebf237935dc2c6d
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
      return {
        success: false,
        message: "Registration failed. Please try again.",
      };
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
