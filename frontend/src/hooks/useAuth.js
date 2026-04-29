import { useCallback } from "react";
import { API_ENDPOINTS } from "../config/api.js";
import { useAuth as useAuthContext } from "../context/AuthContext.jsx";

export function useAuth() {
  const context = useAuthContext();
  const { token, logout } = context;

  const register = useCallback(async (email, password, name) => {
    const res = await fetch(API_ENDPOINTS.REGISTER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username: name }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed");
    return data;
  }, []);

  const authFetch = useCallback(
    async (url, options = {}) => {
      const currentToken = localStorage.getItem("token");
      if (!currentToken) throw new Error("Not authenticated");

      const fullUrl = url.startsWith('http') ? url : `${API_ENDPOINTS.API_BASE_URL}${url}`;
      
      const res = await fetch(fullUrl, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...options.headers,
          Authorization: `Bearer ${currentToken}`,
        },
      });

      if (res.status === 401) {
        logout();
        throw new Error("Unauthorized");
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
      }

      return res.json();
    },
    [logout]
  );

  return { ...context, register, authFetch };
}
