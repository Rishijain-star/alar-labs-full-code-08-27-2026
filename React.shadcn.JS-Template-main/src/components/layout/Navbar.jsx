import React, { useState, useEffect } from "react";
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
  Tag,
  BookOpen,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import ProgressBar from "./ProgressBar";
import { getCurrentUser, getUserFullName } from "@/lib/auth";
import { logout } from "@/store/slices/authSlice";
import { SiteLogo } from "@/components/branding/SiteLogo";

const primaryNavItems = [
  { label: "Labs", href: "/labs", icon: Beaker, tagline: "Hands-on practice" },
  { label: "Courses", href: "/courses", icon: GraduationCap, tagline: "Bundles & paths" },
  { label: "Training", href: "/training", icon: Users, tagline: "Expert-led" },
  { label: "Exam Topics", href: "/exam-topics", icon: BookOpen, tagline: "Practice & Exams" },
  { label: "Certification", href: "/certification", icon: Award, tagline: "Credentials" },
];

const serviceItems = [
  {
    label: "Technology Readiness Assessment",
    shortLabel: "Readiness Assessment",
    href: "/assessment",
    icon: ClipboardCheck,
    tagline: "Benchmark your skills & get a learning plan",
  },
  {
    label: "Cloud Services",
    shortLabel: "Cloud Services",
    href: "/cloud-services",
    icon: Cloud,
    tagline: "Sandbox environments & lab instances",
  },
  {
    label: "Tech Career Pathways",
    shortLabel: "Career Pathways",
    href: "/careers",
    icon: Briefcase,
    tagline: "Roadmaps & career advancement",
  },
  {
    label: "Exam Vouchers",
    shortLabel: "Exam Vouchers",
    href: "/vouchers",
    icon: Tag,
    tagline: "Discounted certification vouchers",
  },
];

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
  const [servicesOpen, setServicesOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((s) => s.auth);

  const user = getCurrentUser();
  const isLoggedIn = isAuthenticated && !!user;

  const isServicesActive = serviceItems.some((item) =>
    navLinkActive(location.pathname, item.href)
  );

  /* ── progress bar on route change ── */
  useEffect(() => {
    setProgress(18);
    const t1 = setTimeout(() => setProgress(55), 120);
    const t2 = setTimeout(() => setProgress(90), 300);
    const t3 = setTimeout(() => setProgress(100), 500);
    const t4 = setTimeout(() => setProgress(0), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
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

  const handleLogoClick = (e) => {
    e.preventDefault();
    close();
    go("/");
  };

  return (
    <nav
      className={cn(
        "fixed left-0 right-0 z-50 border-b shadow-xs transition-[top]",
        "bg-white/95 backdrop-blur-md border-border text-foreground",
        topOffset ? "top-10" : "top-0"
      )}
    >
      <ProgressBar progress={progress} />

      <div className="max-w-7xl mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          <SiteLogo to="/" onClick={handleLogoClick} showTagline variant="default" />

          {/* ── Desktop nav ── */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2">
            {primaryNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={close}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap",
                  navLinkActive(location.pathname, item.href)
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-foreground/80 hover:text-foreground hover:bg-slate-100"
                )}
              >
                {item.label}
              </Link>
            ))}

            {/* Services Dropdown - placed at the end */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap outline-none focus:outline-none",
                  isServicesActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-foreground/80 hover:text-foreground hover:bg-slate-100"
                )}
              >
                Services
                <ChevronDown className="w-4 h-4 opacity-75" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-80 p-2 bg-white/98 backdrop-blur-xl border border-slate-200/80 shadow-xl rounded-xl space-y-1 z-[100]"
              >
                <div className="px-3 py-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Our Specialized Services
                </div>
                {serviceItems.map((item) => {
                  const Icon = item.icon;
                  const active = navLinkActive(location.pathname, item.href);
                  return (
                    <DropdownMenuItem
                      key={item.href}
                      onClick={() => {
                        close();
                        go(item.href);
                      }}
                      className={cn(
                        "flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors border border-transparent",
                        active
                          ? "bg-primary/10 border-primary/20 text-primary font-medium"
                          : "hover:bg-slate-100/90"
                      )}
                    >
                      <div
                        className={cn(
                          "p-2 rounded-lg shrink-0 mt-0.5",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-slate-100 text-slate-700"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground leading-snug">
                          {item.label}
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {item.tagline}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* ── Desktop CTA / User area ── */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {isLoggedIn ? (
              <Button
                size="sm"
                variant="default"
                className="h-10 px-5 text-sm font-semibold shadow-xs rounded-lg"
                onClick={() => go("/app/dashboard")}
              >
                Dashboard
              </Button>
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
              {primaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = navLinkActive(location.pathname, item.href);
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      close();
                      go(item.href);
                    }}
                    className={cn(
                      "flex items-center gap-3 w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
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

              {/* Mobile Services Submenu - placed at the end */}
              <div className="px-4 py-2 mt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setServicesOpen((prev) => !prev)}
                  className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-muted-foreground py-1"
                >
                  <span>Services</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", servicesOpen && "rotate-180")} />
                </button>
                <div className="space-y-1 mt-1">
                  {serviceItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = navLinkActive(location.pathname, item.href);
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => {
                          close();
                          go(item.href);
                        }}
                        className={cn(
                          "flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <div className="min-w-0">
                          <div className="truncate">{item.label}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auth buttons / user info */}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border px-4">
                {isLoggedIn ? (
                  <Button
                    className="justify-start font-medium"
                    onClick={() => {
                      close();
                      go("/app/dashboard");
                    }}
                  >
                    Dashboard
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => {
                        close();
                        go("/auth/login");
                      }}
                    >
                      Sign In
                    </Button>
                    <Button
                      className="justify-start"
                      onClick={() => {
                        close();
                        go("/auth/register");
                      }}
                    >
                      Get Started
                    </Button>
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