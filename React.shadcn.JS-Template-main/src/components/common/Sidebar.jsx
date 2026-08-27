// src/components/layout/Sidebar.jsx (UPDATED WITH API PERMISSION LOADING)
import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  GraduationCap,
  LayoutDashboard,
  Users,
  BookOpen,
  FlaskConical,
  Video,
  Settings,
  HelpCircle,
  Target,
  CheckSquare,
  FolderOpen,
  Image,
  Shield,
  MapPin,
  UserPlus,
  Bookmark,
  Loader2,
  Tag,
  CreditCard,
  Receipt,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useGetMyPurchasedVouchersQuery } from "@/store/api/voucherApi";
import { cn } from "@/lib/utils";
import { hasAnyPermission, hasRole, getUserRoles, hasAnyRequiredRole, collectUserRoleKeys, rolesMatch } from "@/utils/permissions";
import { isApprover, isSuperAdmin, isAdmin, isStudent } from "@/lib/auth";
import { SETTINGS_PAGE_PERMISSIONS } from "@/lib/settingsPermissions";
import { DIGITAL_PROGRAMS_ADMIN_PERMISSIONS } from "@/lib/digitalProgramsPermissions";
import { useInitializePermissions } from "@/hooks/useInitializePermissions";
import { SiteLogo } from "@/components/branding/SiteLogo";

const iconMap = {
  LayoutDashboard,
  Users,
  BookOpen,
  FlaskConical,
  Video,
  Settings,
  HelpCircle,
  GraduationCap,
  CheckSquare,
  FolderOpen,
  Image,
  Target,
  Shield,
  MapPin,
  UserPlus,
  Bookmark,
  Tag,
  CreditCard,
  Receipt,
};

const getIcon = (name) => iconMap[name] || FolderOpen;

const MENU_CONFIG = [
  {
    id: "dashboard",
    path: "/app/dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    permissions: [],
    order: 1,
  },
  {
    id: "my-learning",
    path: "/app/my-learning",
    label: "My Courses",
    icon: "BookOpen",
    studentOnly: true,
    permissions: [],
    order: 1.5,
  },
  {
    id: "my-labs",
    path: "/app/my-labs",
    label: "My Labs",
    icon: "FlaskConical",
    permissions: [],
    order: 1.51,
  },
  {
    id: "my-programs",
    path: "/app/my-programs",
    label: "My Programs",
    icon: "GraduationCap",
    studentOnly: true,
    permissions: [],
    order: 1.52,
  },
  {
    id: "my-vouchers",
    path: "/app/my-vouchers",
    label: "Exam Vouchers",
    icon: "Tag",
    studentPurchasedOnly: "vouchers",
    studentOnly: true,
    permissions: [],
    order: 1.53,
  },
  {
    id: "favorites",
    path: "/app/favorites",
    label: "My Favorites",
    icon: "Bookmark",
    permissions: ["view_favorites"],
    order: 1.55,
  },
  {
    id: "creator-insights",
    path: "/app/creator-insights",
    label: "My content & reach",
    icon: "Target",
    roles: ["admin", "administrator", "super_admin", "creator", "instructor"],
    permissions: ["create_courses", "create_labs"],
    order: 1.6,
  },
  {
    id: "admin-enrollments",
    path: "/app/admin/enrollments",
    label: "Enrollments",
    icon: "Users",
    roles: ["admin", "administrator", "super_admin"],
    permissions: ["view_users"],
    order: 1.7,
  },
  {
    id: "users",
    path: "/app/users",
    label: "Users",
    icon: "Users",
    roles: ["admin", "administrator", "super_admin"],
    permissions: ["view_users"],
    order: 2,
    children: [
      {
        id: "users-list",
        path: "/app/users",
        label: "All Users",
        icon: "Users",
        permissions: ["view_users"],
      },
      {
        id: "users-create",
        path: "/app/users/new",
        label: "Add User",
        icon: "UserPlus",
        permissions: ["create_users"],
      },
    ],
  },
  {
    id: "courses",
    path: "/app/courses/mine",
    label: "Courses",
    icon: "BookOpen",
    permissions: ["view_courses", "create_courses"],
    order: 3,
    children: [
      {
        id: "courses-mine",
        path: "/app/courses/mine",
        label: "My Courses",
        icon: "BookOpen",
        permissions: ["create_courses"],
      },
      {
        id: "courses-others",
        path: "/app/courses/others",
        label: "All Courses",
        icon: "BookOpen",
        permissions: ["view_courses"],
      },
      {
        id: "categories",
        path: "/app/categories",
        label: "Categories",
        icon: "FolderOpen",
        permissions: ["view_categories", "manage_categories"],
      },
    ],
  },
  {
    id: "labs",
    path: "/app/labs/mine",
    label: "Labs",
    icon: "FlaskConical",
    permissions: ["view_labs", "create_labs"],
    order: 4,
    children: [
      {
        id: "labs-mine",
        path: "/app/labs/mine",
        label: "My Labs",
        icon: "FlaskConical",
        permissions: ["create_labs"],
      },
      {
        id: "labs-others",
        path: "/app/labs/others",
        label: "All Labs",
        icon: "FlaskConical",
        permissions: ["view_labs"],
      },
    ],
  },
  /* HIDDEN: Trainer Resources
  {
    id: "instructor-resources",
    path: "/app/instructor-resources",
    label: "Trainer Resources",
    icon: "FolderOpen",
    permissions: [],
    order: 4.2,
  },
  {
    id: "admin-instructor-resources",
    path: "/app/admin/instructor-resources",
    label: "Manage Trainer Resources",
    icon: "FolderOpen",
    roles: ["admin", "administrator", "super_admin"],
    permissions: ["manage_courses"],
    order: 4.3,
  },
  */
  {
    id: "certificates",
    path: "/app/certificates",
    label: "Certificates",
    icon: "GraduationCap",
    roles: ["admin", "administrator", "super_admin", "creator", "instructor"],
    permissions: [
      "view_certifications",
      "view_certificates",
      "manage_certificates",
      "manage_certifications",
      "generate_certificates",
    ],
    order: 4.5,
    children: [
      {
        id: "certificates-list",
        path: "/app/certificates",
        label: "All Certificates",
        icon: "GraduationCap",
        permissions: [
          "view_certifications",
          "view_certificates",
          "manage_certificates",
          "manage_certifications",
          "generate_certificates",
        ],
      },
    ],
  },
  {
    id: "live-webinars",
    path: "/app/live-webinar",
    label: "Live Webinars",
    icon: "Video",
    permissions: ["view_webinars", "create_webinars"],
    order: 5,
  },
  {
    id: "expert-led-training",
    path: "/app/expert-led-training",
    label: "Expert-Led Technology",
    icon: "Target",
    permissions: ["create_expert_led_training", "create_programs", "view_programs"],
    order: 5.1,
  },
  {
    id: "digital-programs",
    path: "/app/digital-programs/cloud-services",
    label: "Digital Programs",
    icon: "FolderOpen",
    permissions: ["create_programs", "create_cloud_services", "manage_cloud_services", "view_programs"],
    order: 5.2,
  },
  {
    id: "payment-history",
    path: "/app/payment-history",
    label: "Payment History",
    icon: "Receipt",
    permissions: ["view_all_payments", "view_own_payments"],
    order: 5.2,
  },

  {
    id: "course-approval",
    path: "/app/course-approval",
    label: "Content approval",
    icon: "CheckSquare",
    roles: ["admin", "administrator", "super_admin", "reviewer"],
    permissions: [
      "approve_courses",
      "approve_own_courses",
      "approve_labs",
      "approve_own_labs",
      "approve_exam_topics",
      "approve_own_exam_topics",
    ],
    order: 6,
  },
  {
    id: "content",
    path: "/app/content/hero",
    label: "Content",
    icon: "Image",
    roles: ["admin", "administrator", "super_admin"],
    permissions: ["view_content", "edit_content"],
    order: 7,
    children: [
      {
        id: "banners",
        path: "/app/banners",
        label: "Banner Section",
        icon: "Image",
        permissions: ["manage_banners"],
      },
      {
        id: "content-logo",
        path: "/app/content/logo",
        label: "Logo Image",
        icon: "Image",
        permissions: ["edit_content"],
      },
      {
        id: "content-topbar",
        path: "/app/content/topbar",
        label: "Top Bar",
        icon: "Image",
        permissions: ["edit_content"],
      },
    ],
  },
  {
    id: "settings",
    path: "/app/settings",
    label: "Settings",
    icon: "Settings",
    roles: ["admin", "administrator", "super_admin"],
    permissions: SETTINGS_PAGE_PERMISSIONS,
    order: 98,
  },
  {
    id: "support",
    path: "/app/support",
    label: "Support",
    icon: "HelpCircle",
    roles: ["admin", "administrator", "super_admin", "support"],
    permissions: ["view_support"],
    order: 99,
  },
  {
    id: "access-control",
    path: "/app/access-control",
    label: "Access Control",
    icon: "Shield",
    roles: ["admin", "administrator", "super_admin"],
    permissions: ["manage_access_control"],
    order: 100,
  },
  {
    id: "account-settings",
    path: "/app/account/settings",
    label: "Account Settings",
    icon: "Settings",
    permissions: [],
    order: 101,
  },
  {
    id: "security",
    path: "/app/account/security",
    label: "Security",
    icon: "Shield",
    permissions: [],
    order: 102,
  },
  {
    id: "help-support",
    path: "/app/account/help",
    label: "Help & Support",
    icon: "HelpCircle",
    permissions: [],
    order: 103,
  },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const [menuItems, setMenuItems] = useState({ main: [], bottom: [] });
  const location = useLocation();

  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const user = useSelector((state) => state.auth.user);

  const { isLoading: permissionsLoading, isInitialized, error: permissionsError } = useInitializePermissions();
  
  // Use voucher api to get voucher purchase info
  const { data: voucherDataObj } = useGetMyPurchasedVouchersQuery(undefined, { skip: !isAuthenticated });
  const purchasedVouchers = voucherDataObj?.data?.rows || voucherDataObj?.rows || [];
  const hasVouchers = purchasedVouchers.length > 0;

  const filterMenuByPermissions = useCallback((menuConfig) => {
    const userRoleKeys = collectUserRoleKeys(user, getUserRoles() || []);

    const canAccessItem = (item) => {
      const isSuperAdminUser = isSuperAdmin();
      const isAdminUser = isAdmin();
      const isFullAccess = isSuperAdminUser;

      const isApproverUser = !isFullAccess && (isApprover() || userRoleKeys.some((k) =>
        ["approver", "content_approver", "content approver", "reviewer"].some((r) => rolesMatch(k, r))
      ));

      if (isApproverUser) {
        if (item.id === "creator-insights" || item.id === "courses-mine" || item.id === "labs-mine") {
          return false;
        }
      }

      if (item.id === "creator-insights" && isSuperAdminUser) {
        return false;
      }

      if (item.studentPurchasedOnly === "vouchers") {
        if (!hasVouchers) return false;
      }

      if (item.studentOnly) {
        if (isFullAccess) return false;
        const staffRoles = ["admin", "administrator", "super_admin", "creator", "instructor"];
        const isStaff = userRoleKeys.some((k) => staffRoles.some((r) => rolesMatch(k, r)));
        if (isStaff) return false;
      }

      // Check if user is a pure student
      const isPureStudent = !isFullAccess && !isApproverUser && (
        isStudent() || (
          userRoleKeys.includes("student") &&
          !userRoleKeys.some((k) => ["admin", "administrator", "super_admin", "approver", "content_approver", "content approver", "reviewer", "creator", "instructor"].some((r) => rolesMatch(k, r)))
        )
      );

      // Block Content Approval option strictly from Students
      if (item.id === "course-approval" && isPureStudent) {
        return false;
      }

      // Super Admin and Executive Admin have full access to all non-student-only admin menu items
      if (isFullAccess && !item.studentOnly) {
        return true;
      }

      const hasPerms = item.permissions?.length > 0;
      const hasRoles = item.roles?.length > 0;

      const permOk = hasPerms ? hasAnyPermission(item.permissions) : true;
      const roleOk =
        !hasRoles ||
        hasAnyRequiredRole(item.roles, userRoleKeys) ||
        item.roles.some((r) => hasRole(r));

      // Admin-only sections (e.g. Digital Programs): must match role AND permission
      if (item.adminOnly) {
        return hasPerms && hasRoles && permOk && roleOk;
      }

      if (hasPerms) {
        try {
          return permOk;
        } catch (error) {
          console.warn(`❌ Permission check failed for ${item.label}:`, error);
          return false;
        }
      }

      if (hasRoles) {
        return roleOk;
      }

      return true;
    };

    return (
      menuConfig
        .filter((item) => canAccessItem(item))
        .map((item) => {
          if (item.children && item.children.length > 0) {
            const filteredChildren = item.children.filter((child) => canAccessItem(child));
            const defaultPath = filteredChildren[0]?.path || item.path;
            return { ...item, path: defaultPath, children: filteredChildren };
          }
          return item;
        })
        .filter((item) => {
          if (!item.children) return true;
          return item.children.length > 0;
        })
    );
  }, [user, hasVouchers]);

  const processRoutes = useCallback((routes) => {
    return routes.map((route) => ({
      ...route,
      icon: getIcon(route.icon),
      children: route.children ? processRoutes(route.children) : [],
    }));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setMenuItems({ main: [], bottom: [] });
      return;
    }

    if (!isInitialized) {
      console.log('⏳ Waiting for permissions to initialize...');
      return;
    }

    if (permissionsLoading) {
      console.log('⏳ Permissions still loading...');
      return;
    }

    try {
      console.log('🔄 Filtering sidebar menu with loaded permissions...');

      const filteredMenu = filterMenuByPermissions(MENU_CONFIG);
      const routesWithIcons = processRoutes(filteredMenu);

      const mainRoutes = routesWithIcons
        .filter((r) => !r.order || r.order < 98)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const bottomRoutes = routesWithIcons
        .filter((r) => r.order && r.order >= 98)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      setMenuItems({ main: mainRoutes, bottom: bottomRoutes });

      console.log('✅ Sidebar menu loaded:', {
        main: mainRoutes.length,
        bottom: bottomRoutes.length,
        total: routesWithIcons.length,
        mainItems: mainRoutes.map((r) => r.label),
        bottomItems: bottomRoutes.map((r) => r.label),
      });
    } catch (e) {
      console.error('❌ Sidebar – failed to process menu:', e);
      const dashboardOnly = MENU_CONFIG.filter((item) => item.id === "dashboard");
      const processedDashboard = processRoutes(dashboardOnly);
      setMenuItems({ main: processedDashboard, bottom: [] });
    }
  }, [
    isAuthenticated,
    isInitialized,
    permissionsLoading,
    user?.id,
    filterMenuByPermissions,
    processRoutes,
  ]);

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const expanded = {};
    [...menuItems.main, ...menuItems.bottom].forEach((item) => {
      if (item.children?.some((c) => isActive(c.path))) {
        expanded[item.label] = true;
      }
    });
    setOpenMenus((prev) => ({ ...prev, ...expanded }));
  }, [location.pathname, menuItems.main, menuItems.bottom]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const width = collapsed ? "4rem" : "15rem"; // 16 vs 60 in Tailwind
    document.documentElement.style.setProperty("--sidebar-w", width);
    return () => {
    };
  }, [collapsed]);

  const toggleSubmenu = (label) =>
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));

  const renderItem = (item) => {
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
    const open = openMenus[item.label];
    const active = hasChildren
      ? item.children.some((c) => isActive(c.path))
      : isActive(item.path);

    if (hasChildren) {
      return (
        <div key={item.id || item.label}>
          <button
            type="button"
            onClick={() => toggleSubmenu(item.label)}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5" />
              {!collapsed && <span>{item.label}</span>}
            </div>
            {!collapsed &&
              (open ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              ))}
          </button>

          {!collapsed && open && (
            <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-2">
              {item.children.map((child) => (
                <Link
                  key={child.id || child.path}
                  to={child.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive(child.path)
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <child.icon className="h-4 w-4" />
                  <span>{child.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.id || item.path}
        to={item.path}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <item.icon className="h-5 w-5" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg border bg-white p-2 shadow lg:hidden"
        type="button"
      >
        {mobileOpen ? <X /> : <Menu />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r bg-white transition-all duration-300",
          "lg:translate-x-0",
          collapsed ? "lg:w-16" : "lg:w-60",
          mobileOpen
            ? "w-60 translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center border-b px-4">
          <SiteLogo to="/app/dashboard" variant="admin" collapsed={collapsed} showTagline={false} />
        </div>

        <nav className="flex h-[calc(100vh-4rem)] flex-col justify-between overflow-y-auto p-3">
          <div className="space-y-1">
            {permissionsLoading || !isInitialized ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {!collapsed && <span>Loading menu...</span>}
              </div>
            ) : permissionsError ? (
              <div className="px-3 py-2 text-sm text-destructive">
                {!collapsed && "Error loading permissions"}
              </div>
            ) : menuItems.main.length > 0 ? (
              menuItems.main.map(renderItem)
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {!collapsed && (isAuthenticated ? "No menu items available" : "Please log in")}
              </div>
            )}
          </div>

          {isInitialized && !permissionsLoading && menuItems.bottom.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/80 space-y-1">
              {!collapsed && (
                <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Settings & Security
                </div>
              )}
              {menuItems.bottom.map(renderItem)}
            </div>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 hidden h-6 w-6 items-center justify-center rounded-full border bg-white shadow lg:flex"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </aside>
    </>
  );
};

export default Sidebar;
