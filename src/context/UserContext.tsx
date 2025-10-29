import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  FC,
} from "react";

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
  register: (
    name: string,
    email: string,
    password: string,
    role?: string
  ) => Promise<AuthResponse>;
  logout: () => void;
  setAuthData: (user: User, token: string) => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
  checkAuthStatus: () => Promise<void>;
}

interface UserProviderProps {
  children: ReactNode;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("authToken")
  );
  const [loading, setLoading] = useState<boolean>(true);

  // 🔁 Restore from localStorage instantly (before hitting API)
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
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/auth/me`, // ✅ fixed endpoint
        {
          headers: {
            Authorization: `Bearer ${savedToken}`,
            "Content-Type": "application/json",
          },
        }
      );

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
        localStorage.setItem("authUser", JSON.stringify(normalizedUser)); // ✅ keep in sync
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
      setLoading(false);
    }
  };

  // ✅ store user + token
  const setAuthData = (user: User, token: string) => {
    const normalizedUser: User = { ...user, id: user._id || user.id };
    localStorage.setItem("authToken", token);
    localStorage.setItem("authUser", JSON.stringify(normalizedUser));
    setToken(token);
    setUser(normalizedUser);
  };

  const login = async (
    email: string,
    password: string
  ): Promise<AuthResponse> => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setAuthData(data.user, data.token);
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message };
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
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, role }),
        }
      );

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
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setToken(null);
    setUser(null);
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
    checkAuthStatus,
  };

  if (loading)
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context)
    throw new Error("useUser must be used within a UserProvider");
  return context;
};

export { UserContext };
