import {
  createContext,
  useContext,
  useState,
} from "react";
import type { ReactNode } from "react";
import { login as loginApi, register as registerApi } from "../services/authService";
import type { LoginRequest, RegisterRequest } from "../services/authService";

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to decode JWT and check expiration
const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const base64Url = parts[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const paddedLength = base64.length + (4 - base64.length % 4) % 4;
    base64 = base64.padEnd(paddedLength, '=');

    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return true;

    // exp is in seconds, Date.now() is in ms
    return payload.exp * 1000 > Date.now();
  } catch (e) {
    return false;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken && isTokenValid(storedToken)) {
      return storedToken;
    }
    localStorage.removeItem("token");
    return null;
  });

  // Check if token exists to determine auth status
  const isAuthenticated = !!token;

  const login = async (data: LoginRequest) => {
    try {
      const response = await loginApi(data);
      const { token: jwt } = response;
      if (!jwt || jwt.split('.').length !== 3) {
        throw new Error(jwt || 'Invalid credentials');
      }
      localStorage.setItem("token", jwt);
      setToken(jwt);
    } catch (error: any) {
      const msg =
        error.response?.data?.detail
        || error.response?.data?.message
        || error.message
        || "Invalid credentials";
      throw new Error(msg);
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await registerApi(data);
      const { token: jwt } = response;
      if (!jwt || jwt.split('.').length !== 3) {
        throw new Error(jwt || 'Registration failed');
      }
      localStorage.setItem("token", jwt);
      setToken(jwt);
    } catch (error: any) {
      const msg =
        error.response?.data?.detail
        || error.response?.data?.message
        || error.message
        || "Registration failed";
      throw new Error(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth easily
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
