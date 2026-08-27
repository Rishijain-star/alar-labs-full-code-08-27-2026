// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { hasAnyRole, hasAnyPermission } from "@/lib/auth";
import { getCurrentUser, hasValidSession } from "@/lib/auth-helpers";

/* ─────────────────────────────────────────────────────────
   ProtectedRoute
   Guards a subtree.  Auth decision is based on
   hasValidSession() (localStorage: user + sessionId).
   The accessToken cookie is NOT part of this check —
   it is short-lived and only needed for API headers.
   ───────────────────────────────────────────────────── */
export const ProtectedRoute = ({
  children,
  roles = [],
  permissions = [],
  redirectTo = "/auth/login",
  fallback = null,
}) => {
  const location = useLocation();
  const { isLoading } = useSelector((s) => s.auth);

  // Check session from localStorage directly.
  // This is truthy even right after a hard refresh
  // (Redux state is also hydrated, but this is the ground truth).
  const sessionValid = hasValidSession();
  const user = getCurrentUser();

  /* ── still waiting for an in-flight network request ── */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  /* ── no valid session ── */
  if (!sessionValid || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  /* ── role gate (any-match) ── */
  if (roles.length > 0 && !hasAnyRole(roles)) {
    return fallback || <Navigate to="/unauthorized" replace />;
  }

  /* ── permission gate (any-match) ── */
  if (permissions.length > 0 && !hasAnyPermission(permissions)) {
    return fallback || <Navigate to="/unauthorized" replace />;
  }

  return children;
};

/* ─────────────────────────────────────────────────────────
   PublicRoute
   If the user already has a valid session we bounce them
   to /app (which will use SmartRedirect to find their first
   accessible route). Uses hasValidSession() so it works even
   when the accessToken cookie has expired or is missing.
   ───────────────────────────────────────────────────────── */
export const PublicRoute = ({ children }) => {
  const sessionValid = hasValidSession();
  const user = getCurrentUser();

  if (sessionValid && user) {
    // Redirect to /app, SmartRedirect will handle finding the right page
    return <Navigate to="/app" replace />;
  }

  return children;
};

/* ── convenience wrappers ── */
export const RoleRoute = ({ children, roles = [], ...props }) => (
  <ProtectedRoute roles={roles} {...props}>{children}</ProtectedRoute>
);

export const AdminRoute = ({ children, ...props }) => (
  <ProtectedRoute roles={["admin"]} {...props}>{children}</ProtectedRoute>
);

export default ProtectedRoute;