import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  Beaker,
  GraduationCap,
  Award,
  Users,
  Cloud,
  Briefcase,
  ClipboardCheck,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ProgressBar from "./ProgressBar";
import { getCurrentUser, getUserFullName } from "@/lib/auth";
import { logout } from "@/store/slices/authSlice";
import { SiteLogo } from "@/components/branding/SiteLogo";


const primaryNavItems = [
  { label: "Training", href: "/training", icon: Users, tagline: "Expert-led" },
  { label: "Labs", href: "/labs", icon: Beaker, tagline: "Hands-on practice" },
  { label: "Courses", href: "/courses", icon: GraduationCap, tagline: "Bundles & paths" },
  { label: "Assessments", href: "/assessment", icon: ClipboardCheck, tagline: "Benchmark skills" },
];

const moreNavItems = [
  { label: "Certification", href: "/certification", icon: Award, tagline: "Credentials" },
  { label: "Cloud Services", href: "/cloud-services", icon: Cloud, tagline: "Cloud catalog" },
  { label: "Careers", href: "/careers", icon: Briefcase, tagline: "Join us" },
];

const mainNavItems = [...primaryNavItems, ...moreNavItems];

function navLinkActive(pathname, href) {
  if (href === "/") return pathname === "/";
  if (href.includes("#")) {
    const [path, frag] = href.split("#");
    if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;
    return typeof window !== "undefined" && window.location.hash === `#${frag}`;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar({ topOffset = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((s) => s.auth);

  const user = getCurrentUser();
  const isLoggedIn = isAuthenticated && !!user;
  const displayName = getUserFullName() || "User";

  /* ── progress bar on route change ── */
  useEffect(() => {
    setProgress(18);
    const t1 = setTimeout(() => setProgress(55), 120);
    const t2 = setTimeout(() => setProgress(90), 300);
    const t3 = setTimeout(() => setProgress(100), 500);
    const t4 = setTimeout(() => setProgress(0), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [location.pathname]);

  /* ── helpers ── */
  const close = () => setIsOpen(false);
  const go = (path) => {
    if (path.includes("#")) {
      const [p, h] = path.split("#");
      navigate({ pathname: p, hash: `#${h}` });
    } else {
      navigate(path);
    }
    window.scrollTo(0, 0);
  };
  const handleLogout = () => { dispatch(logout()); navigate("/"); };

  /* ── logo click ── */
  const handleLogoClick = (e) => { e.preventDefault(); close(); go("/"); };

  /* ════════════════════════════════════════════ */
  return (
    <nav
      className={cn(
        "fixed left-0 right-0 z-50 border-b shadow-sm transition-[top]",
        "bg-white backdrop-blur-md border-border text-foreground",
        topOffset ? "top-10" : "top-0"
      )}
    >
      <ProgressBar progress={progress} />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">

          <SiteLogo to="/" onClick={handleLogoClick} showTagline variant="default" />

          {/* ── Desktop nav: show all links directly ── */}
          <div className="hidden lg:flex flex-1 min-w-0 px-2">
            <div className="mx-auto max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-center gap-1 min-w-max">
                {mainNavItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={close}
                    className={cn(
                      "px-2.5 py-1.5 rounded-md text-xs xl:text-sm font-semibold transition-colors whitespace-nowrap",
                      navLinkActive(location.pathname, item.href)
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground/80 hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ── Desktop CTA / User area ── */}
          <div className="hidden lg:flex items-center gap-1 shrink-0">
            {isLoggedIn ? (
              <>
                {/* Dashboard shortcut */}
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => go("/app/dashboard")}>
                  Dashboard
                </Button>

                {/* User badge */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold bg-primary text-primary-foreground">
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium max-w-[88px] truncate text-foreground">
                    {displayName}
                  </span>
                </div>

                {/* Sign out */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleLogout}
                >
                  <LogOut className="w-3.5 h-3.5 mr-1" /> Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => go("/auth/login")}>
                  Sign In
                </Button>
                <Button size="sm" onClick={() => go("/auth/register")}>
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg hover:bg-muted"
            onClick={() => setIsOpen((s) => !s)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* ── Mobile Menu ── */}
        {isOpen && (
          <div className="lg:hidden py-4 border-t border-border max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex flex-col gap-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = navLinkActive(location.pathname, item.href);
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => { close(); go(item.href); }}
                    className={cn(
                      "flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <div>
                      <div>{item.label}</div>
                      <div className="text-xs opacity-70">{item.tagline}</div>
                    </div>
                  </button>
                );
              })}

              {/* Auth buttons / user info */}
              <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-border px-4">
                {isLoggedIn ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                        {displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-foreground">{displayName}</span>
                    </div>
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => {
                        close();
                        go("/app/dashboard");
                      }}
                    >
                      Dashboard
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start text-destructive border-destructive hover:bg-destructive/10"
                      onClick={() => {
                        close();
                        handleLogout();
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" className="justify-start" onClick={() => { close(); go("/auth/login"); }}>Sign In</Button>
                    <Button className="justify-start" onClick={() => { close(); go("/auth/register"); }}>Get Started</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;