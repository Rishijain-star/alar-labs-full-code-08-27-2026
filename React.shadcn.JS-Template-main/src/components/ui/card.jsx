import * as React from "react";

import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";

const cardVariants = cva(
  "rounded-xl border bg-card text-card-foreground transition-all duration-300",
  {
    variants: {
      variant: {
        default: "shadow-card hover:shadow-card-hover",
        elevated: "shadow-md hover:shadow-lg hover:-translate-y-1",
        outline: "border-border hover:border-primary/30 shadow-none",
        ghost: "border-transparent shadow-none hover:bg-muted",
        feature:
          "border-border bg-card shadow-card hover:shadow-card-hover hover:-translate-y-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/* ---------------- SKELETON ---------------- */

const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      {...props}
    />
  );
};

/* ---------------- CARD ---------------- */

const Card = React.forwardRef(
  ({ className, variant, isLoading, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        cardVariants({ variant }),
        "flex flex-col h-full",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

/* ---------------- HEADER ---------------- */

const CardHeader = React.forwardRef(
  ({ className, isLoading, ...props }, ref) => {
    if (isLoading) {
      return (
        <div
          ref={ref}
          className={cn("flex flex-col space-y-1.5 p-6", className)}
        >
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 p-6", className)}
        {...props}
      />
    );
  }
);
CardHeader.displayName = "CardHeader";

/* ---------------- TITLE ---------------- */

const CardTitle = React.forwardRef(
  ({ className, isLoading, ...props }, ref) => {
    if (isLoading) {
      return <Skeleton className="h-7 w-3/4" />;
    }

    return (
      <h3
        ref={ref}
        className={cn(
          "text-2xl font-semibold leading-none tracking-tight",
          className
        )}
        {...props}
      />
    );
  }
);
CardTitle.displayName = "CardTitle";

/* ---------------- DESCRIPTION ---------------- */

const CardDescription = React.forwardRef(
  ({ className, isLoading, ...props }, ref) => {
    if (isLoading) {
      return <Skeleton className="h-4 w-full" />;
    }

    return (
      <p
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
      />
    );
  }
);
CardDescription.displayName = "CardDescription";

/* ---------------- CONTENT ---------------- */

const CardContent = React.forwardRef(
  ({ className, isLoading, skeletonLines = 3, ...props }, ref) => {
    if (isLoading) {
      return (
        <div
          ref={ref}
          className={cn("p-6 pt-0 flex-1 space-y-3", className)}
        >
          {Array.from({ length: skeletonLines }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn(
                "h-4",
                i === skeletonLines - 1 ? "w-2/3" : "w-full"
              )}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn("p-6 pt-0 flex-1", className)}
        {...props}
      />
    );
  }
);
CardContent.displayName = "CardContent";

/* ---------------- FOOTER ---------------- */

const CardFooter = React.forwardRef(
  ({ className, isLoading, ...props }, ref) => {
    if (isLoading) {
      return (
        <div
          ref={ref}
          className={cn("flex items-center p-6 pt-0 gap-2", className)}
        >
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn("flex items-center p-6 pt-0", className)}
        {...props}
      />
    );
  }
);
CardFooter.displayName = "CardFooter";

/* ---------------- EXPORTS ---------------- */

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  Skeleton,
};