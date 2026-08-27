import React from "react";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";

export default function DigitalProgramSidebar({
  items = [],
  className = "",
  matchStart = false,
  onSelect = null,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleClick = (item) => {
    if (typeof onSelect === "function") onSelect(item);
    if (location.pathname !== item.href) navigate(item.href);
  };

  const handleKey = (e, item) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick(item);
    }
  };

  return (
    <nav
      aria-label="Settings sidebar"
      className={cn("bg-card border border-border rounded-xl p-2 shadow-sm h-full", className)}
    >
      <ul
        className={cn(
          "flex overflow-x-auto lg:flex-col gap-1",
          "divide-x lg:divide-x-0 divide-border"
        )}
      >
        {items.map((item) => {
          const isActive = matchStart
            ? location.pathname === item.href || location.pathname.startsWith(item.href + "/")
            : location.pathname === item.href;

          return (
            <li key={item.href} className="first:pl-0 last:pr-0">
              <div
                role="link"
                tabIndex={0}
                aria-current={isActive ? "page" : undefined}
                onClick={() => handleClick(item)}
                onKeyDown={(e) => handleKey(e, item)}
                className={cn(
                  "px-4 py-3 text-sm cursor-pointer whitespace-nowrap transition-all select-none rounded-lg font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90 hover:text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
