import { createContext, useState, useEffect, useContext } from "react";
import client from "../api/client";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On mount, check if have a token
    const token = localStorage.getItem("access_token");
    if (token) {
      // Try to fetch user
      client
        .get("/users/me")
        .then((r) => {
          setUser(r.data);
          setIsAuthenticated(true);
        })
        .catch(() => {
          localStorage.clear();
          setIsAuthenticated(false);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await client.post("/auth/login", { email, password });
    localStorage.setItem("access_token", res.data.access_token);
    const userRes = await client.get("/users/me");
    setUser(userRes.data);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setIsAuthenticated(false);
  };

  const signup = async (name, email, password) => {
    await client.post("/auth/signup", { name, email, password });
    // After signup, user sees "check your email" — don't auto-login yet
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, loading, login, logout, signup }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
