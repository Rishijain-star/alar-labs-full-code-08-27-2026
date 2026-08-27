import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useGetPublicLegalQuery } from "@/store/api/legalApi";

export default function LegalPage() {
  const location = useLocation();
  const type = useMemo(() => (location.pathname.includes("privacy") ? "privacy" : "terms"), [location.pathname]);
  const { data, isLoading, isError } = useGetPublicLegalQuery(type);
  const doc = data?.data?.document;

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-4">
          {type === "privacy" ? "Privacy Policy" : "Terms & Conditions"}
        </h1>
        {isLoading ? <p className="text-muted-foreground">Loading document...</p> : null}
        {isError ? <p className="text-destructive">Could not load document.</p> : null}
        {doc?.content ? (
          <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: doc.content }} />
        ) : null}
      </div>
    </div>
  );
}
