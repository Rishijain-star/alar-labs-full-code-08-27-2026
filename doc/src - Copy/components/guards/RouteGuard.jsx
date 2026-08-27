
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation, Link } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { canAccessRoute } from "@/utils/permissions";
import { useInitializePermissions } from "@/hooks/useInitializePermissions";

export const RouteGuard = ({ 
    children, 
    permissions = [], 
    route = null,
    fallbackPath = "/app/dashboard" 
}) => {
    const location = useLocation();
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
    const [hasAccess, setHasAccess] = useState(null); // null = checking, true = allowed, false = denied

    const { isLoading: permissionsLoading, isInitialized } = useInitializePermissions();

    useEffect(() => {
        if (!isAuthenticated) {
            setHasAccess(false);
            return;
        }

        if (!isInitialized || permissionsLoading) {
            setHasAccess(null);
            return;
        }

        try {
            let hasRouteAccess = false;

            if (route && route.permissions) {
                hasRouteAccess = canAccessRoute(route);
            } 
            else if (permissions && permissions.length > 0) {
                hasRouteAccess = canAccessRoute({ permissions });
            } 
            else {
                hasRouteAccess = true;
            }

            if (!hasRouteAccess) {
                console.warn(`🚫 RouteGuard: Access denied to ${location.pathname}`);
                console.warn("Required permissions:", route?.permissions || permissions);
            } else {
                console.log(`✅ RouteGuard: Access granted to ${location.pathname}`);
            }

            setHasAccess(hasRouteAccess);
        } catch (error) {
            console.error("❌ RouteGuard error:", error);
            setHasAccess(false);
        }
    }, [
        isAuthenticated, 
        location.pathname, 
        permissions, 
        route, 
        permissionsLoading, 
        isInitialized
    ]);

    if (!isAuthenticated) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    if (hasAccess === null || !isInitialized) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Verifying access...</p>
                </div>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center max-w-md mx-auto p-6">
                    <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-destructive" />
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p className="text-muted-foreground mb-4">
                        You don't have permission to access this page.
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">
                        If you believe this is an error, please contact your administrator.
                    </p>
                    <Link
                        to={fallbackPath}
                        className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return children;
};

/**
 * RouteGuard with custom unauthorized component (OPTIMIZED)
 */
export const RouteGuardWithFallback = ({
    children,
    permissions = [],
    route = null,
    fallbackPath = "/app/dashboard",
    unauthorizedComponent
}) => {
    const location = useLocation();
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
    const [hasAccess, setHasAccess] = useState(null);

    const { isLoading: permissionsLoading, isInitialized } = useInitializePermissions();

    useEffect(() => {
        if (!isAuthenticated) {
            setHasAccess(false);
            return;
        }

        if (!isInitialized || permissionsLoading) {
            setHasAccess(null);
            return;
        }

        try {
            let hasRouteAccess = false;

            if (route && route.permissions) {
                hasRouteAccess = canAccessRoute(route);
            } else if (permissions && permissions.length > 0) {
                hasRouteAccess = canAccessRoute({ permissions });
            } else {
                hasRouteAccess = true;
            }

            setHasAccess(hasRouteAccess);
        } catch (error) {
            console.error("❌ RouteGuard error:", error);
            setHasAccess(false);
        }
    }, [
        isAuthenticated, 
        location.pathname, 
        permissions, 
        route, 
        permissionsLoading, 
        isInitialized
    ]);

    if (!isAuthenticated) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    if (hasAccess === null || !isInitialized) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Verifying access...</p>
                </div>
            </div>
        );
    }

    if (!hasAccess) {
        if (unauthorizedComponent) {
            return unauthorizedComponent;
        }

        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center max-w-md mx-auto p-6">
                    <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-destructive" />
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p className="text-muted-foreground mb-4">
                        You don't have permission to access this page.
                    </p>
                    <Link
                        to={fallbackPath}
                        className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return children;
};

export default RouteGuard;