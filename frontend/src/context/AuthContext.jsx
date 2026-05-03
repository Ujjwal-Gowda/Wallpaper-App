import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { API_ENDPOINTS } from "../config/api.js";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      const currentToken = localStorage.getItem("token");
      if (currentToken) {
        await fetch(API_ENDPOINTS.LOGOUT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
        });
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
      setLoading(false);
      return null;
    }

    try {
      // Backend route is /auth/verify, not /auth/me
      const res = await fetch(API_ENDPOINTS.VERIFY, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (res.status === 401) {
        logout();
        return null;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (data?.user) {
        setUser(data.user);
        setToken(currentToken);
        return data.user;
      } else {
        logout();
        return null;
      }
    } catch (err) {
      console.error("checkAuth failed:", err.message);
      // Only logout on auth errors, not network failures
      if (err.message.includes("401")) {
        logout();
      } else {
        // Network error — keep local token, hydrate user from localStorage
        const stored = localStorage.getItem("user");
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch {
            /* ignore parse error */
          }
        }
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const res = await fetch(API_ENDPOINTS.LOGIN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        checkAuth,
        setUser,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
