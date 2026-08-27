import { X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Fixed validation error strip above step navigation. Dismissible via close button.
 */
export default function ValidationErrorBanner({ errors = [], onDismiss, className }) {
  if (!errors.length) return null;

  return (
    <div className={cn("fixed bottom-24 left-0 right-0 z-50", className)}>
      <div className="container mx-auto px-4">
        <Card className="border-red-200 bg-red-50 shadow-md">
          <CardContent className="relative p-4 pr-10">
            <button
              type="button"
              onClick={onDismiss}
              className="absolute top-3 right-3 rounded-md p-1 text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300"
              aria-label="Dismiss errors"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="font-bold text-red-800 mb-2">Please fix the following errors:</h3>
            <ul className="list-disc pl-5 text-red-700 space-y-0.5">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
