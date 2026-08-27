// src/components/guards/SmartRedirect.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useInitializePermissions } from "@/hooks/useInitializePermissions";

export const SmartRedirect = ({ fallbackPath = "/app/dashboard" }) => {
    const [isReady, setIsReady] = useState(false);

    const { isLoading, isInitialized } = useInitializePermissions();

    useEffect(() => {
        if (!isLoading && isInitialized) {
            setIsReady(true);
        }
    }, [isLoading, isInitialized]);

    if (!isReady || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Loading your workspace...</p>
                </div>
            </div>
        );
    }

    return <Navigate to={fallbackPath} replace />;
};

/**
 * SmartRedirect with Menu-Based Navigation
 * 
 * This version uses the static menu configuration to find
 * the first accessible route for the user.
 */
export const SmartRedirectWithMenu = ({
    fallbackPath = "/app/dashboard",
    menuConfig = []
}) => {
    const [redirectPath, setRedirectPath] = useState(null);

    const { isLoading, isInitialized } = useInitializePermissions();

    useEffect(() => {
        if (isLoading || !isInitialized) {
            return;
        }

        import('@/utils/permissions').then(({ hasAnyPermission }) => {
           
            const firstRoute = findFirstAccessibleRoute(menuConfig, hasAnyPermission);

            if (firstRoute) {
                console.log("SmartRedirect: Redirecting to first accessible route:", firstRoute);
                setRedirectPath(firstRoute);
            } else {
                console.warn("SmartRedirect: No accessible routes found, using fallback");
                setRedirectPath(fallbackPath);
            }
        });
    }, [isLoading, isInitialized, menuConfig, fallbackPath]);

    if (isLoading || !isInitialized || redirectPath === null) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Loading your workspace...</p>
                </div>
            </div>
        );
    }

    return <Navigate to={redirectPath} replace />;
};

/**
 * 
 */
const findFirstAccessibleRoute = (menuConfig, hasAnyPermission) => {
    if (!menuConfig || menuConfig.length === 0) {
        return null;
    }

    const dashboardItem = menuConfig.find(item =>
        item.path === '/app/dashboard' || item.id === 'dashboard'
    );

    if (dashboardItem) {
        if (!dashboardItem.permissions || dashboardItem.permissions.length === 0) {
            return dashboardItem.path;
        }
        if (hasAnyPermission(dashboardItem.permissions)) {
            return dashboardItem.path;
        }
    }

    for (const item of menuConfig) {
        const hasPermission = !item.permissions ||
            item.permissions.length === 0 ||
            hasAnyPermission(item.permissions);

        if (hasPermission) {
            if (item.children && item.children.length > 0) {
                for (const child of item.children) {
                    const hasChildPermission = !child.permissions ||
                        child.permissions.length === 0 ||
                        hasAnyPermission(child.permissions);

                    if (hasChildPermission) {
                        return child.path;
                    }
                }
            }
            return item.path;
        }
    }

    return null;
};

export default SmartRedirect;