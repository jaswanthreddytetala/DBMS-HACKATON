import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { homePathForRole, useAuth, type UserRole } from "../context/AuthContext";

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm font-medium text-slate-600">Verifying your session…</div>;
  }
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return roles.includes(user.role) ? children : <Navigate to={homePathForRole(user.role)} replace />;
}
