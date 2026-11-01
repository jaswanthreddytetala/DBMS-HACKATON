import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../services/api";

export type UserRole = "ADMIN" | "OPERATOR" | "DRIVER";

export type AuthUser = {
  userId: number;
  fullName: string;
  email: string;
  role: UserRole;
};

type AuthResponse = AuthUser & { token: string };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  error: string;
  signIn: (session: AuthResponse) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const USER_KEY = "voltflow_user";
const TOKEN_KEY = "voltflow_token";
const roles: UserRole[] = ["ADMIN", "OPERATOR", "DRIVER"];

type JwtIdentity = { email: string; role: UserRole };

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<AuthUser>;
  return typeof user.userId === "number"
    && Number.isFinite(user.userId)
    && typeof user.fullName === "string"
    && typeof user.email === "string"
    && roles.includes(user.role as UserRole);
}

function readTokenIdentity(token: string): JwtIdentity | null {
  try {
    const segments = token.split(".");
    if (segments.length !== 3 || segments.some((segment) => !segment)) return null;

    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), "=");
    const claims: unknown = JSON.parse(atob(normalized));
    if (!claims || typeof claims !== "object") return null;

    const jwt = claims as { sub?: unknown; role?: unknown; iat?: unknown; exp?: unknown };
    if (
      typeof jwt.sub !== "string"
      || !jwt.sub.trim()
      || typeof jwt.role !== "string"
      || !roles.includes(jwt.role as UserRole)
      || typeof jwt.iat !== "number"
      || !Number.isFinite(jwt.iat)
      || typeof jwt.exp !== "number"
      || !Number.isFinite(jwt.exp)
      || jwt.exp * 1000 <= Date.now()
    ) {
      return null;
    }

    return { email: jwt.sub, role: jwt.role as UserRole };
  } catch {
    return null;
  }
}

function readStoredUser(): AuthUser | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  const identity = readTokenIdentity(token);
  if (!identity) {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    return null;
  }

  const storedUser = sessionStorage.getItem(USER_KEY);
  if (storedUser) {
    try {
      const parsed: unknown = JSON.parse(storedUser);
      if (isAuthUser(parsed) && parsed.email.toLowerCase() === identity.email.toLowerCase()) {
        return { ...parsed, role: identity.role };
      }
    } catch {
      sessionStorage.removeItem(USER_KEY);
    }
  }
  return {
    userId: 0,
    fullName: identity.email,
    email: identity.email,
    role: identity.role,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const signOut = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setUser(null);
    setError("");
    setLoading(false);
  };

  const signIn = (session: AuthResponse) => {
    const identity = typeof session.token === "string" ? readTokenIdentity(session.token) : null;
    if (
      !identity
      || !isAuthUser(session)
      || identity.email.toLowerCase() !== session.email.toLowerCase()
      || identity.role !== session.role
    ) {
      throw new Error("The server returned an invalid sign-in response.");
    }
    sessionStorage.setItem(TOKEN_KEY, session.token);
    sessionStorage.setItem(USER_KEY, JSON.stringify({
      userId: session.userId,
      fullName: session.fullName,
      email: session.email,
      role: session.role,
    }));
    setUser(session);
    setError("");
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    if (!user) {
      setLoading(false);
      return () => { active = false; };
    }

    authApi.me()
      .then(({ data }) => {
        if (!active) return;
        const profile: AuthUser = {
          userId: data.userId,
          fullName: data.fullName,
          email: data.email,
          role: data.role,
        };
        sessionStorage.setItem(USER_KEY, JSON.stringify(profile));
        setUser(profile);
        setError("");
      })
      .catch((cause: Error) => {
        if (!active) return;
        if (!sessionStorage.getItem(TOKEN_KEY)) {
          setUser(null);
          return;
        }
        setError(cause.message || "Could not verify the saved sign-in session.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => signOut();
    window.addEventListener("voltflow:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("voltflow:unauthorized", handleUnauthorized);
  }, []);

  const value = useMemo(() => ({ user, loading, error, signIn, signOut }), [user, loading, error]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}

export function homePathForRole(role: UserRole) {
  return role === "DRIVER" ? "/app/stations" : "/app/dashboard";
}
