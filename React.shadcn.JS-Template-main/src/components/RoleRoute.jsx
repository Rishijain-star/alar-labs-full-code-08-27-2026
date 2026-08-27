// components/RoleRoute.jsx
import React from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

export default function RoleRoute({ allowed = [], redirectTo = "/auth/login" }) {
    const user = useSelector((s) => s.auth.user);
    if (!user) return <Navigate to={redirectTo} replace />;
    const has = user.roles?.some(r => allowed.includes(r));
    return has ? <Outlet /> : <Navigate to="/forbidden" replace />;
}
