import { useParams, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useGetPublicSectionQuery } from "@/store/api/digitalProgramApi";
import { sanitizeCourseDescriptionHtml } from "@/lib/sanitizeCourseHtml";
import SEO from "@/components/Seo";
import { Button } from "@/components/ui/button";

const KEY_LABELS = {
  technology_readiness_assessment: "Technology Readiness Assessment",
  digital_skill_program: "Digital Skill Program",
  home_page_highlights: "Home",
  skill_builder_labs: "Skill Builder Labs",
  tech_career_pathways: "Tech Career Pathways",
  expert_led_training: "Expert-Led Training",
  technical_lab_manual_azure_storage_java: "Technical Lab — Azure Storage (Java)",
};

export default function ProgramPublicPage() {
  const { sectionKey } = useParams();
  const { data, isLoading, isError, error } = useGetPublicSectionQuery(sectionKey, {
    skip: !sectionKey,
  });

  const section = data?.data?.section ?? data?.section;
  const title = section?.title || KEY_LABELS[sectionKey] || "Program";
  const subtitle = section?.subtitle || "";
  const body = section?.body || {};
  const html = typeof body.html === "string" ? sanitizeCourseDescriptionHtml(body.html) : "";
  const bullets = Array.isArray(body.bullets) ? body.bullets : [];

  if (isLoading) {
    return (
      <div className="min-h-[50vh] grid place-items-center">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !section) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-semibold mb-2">Page not available</h1>
        <p className="text-muted-foreground mb-6">
          {error?.data?.message || "This section is not published yet or does not exist."}
        </p>
        <Button asChild variant="outline">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <SEO title={`${title} | Programs`} description={subtitle || title} />
      <article className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <header className="mb-8">
          <p className="text-sm text-muted-foreground mb-2">
            <Link to="/" className="hover:underline">
              Home
            </Link>{" "}
            / <span>Programs</span>
          </p>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle ? <p className="text-lg text-muted-foreground mt-2">{subtitle}</p> : null}
        </header>
        {html ? (
          <div
            className="prose prose-neutral dark:prose-invert max-w-none mb-8"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : null}
        {bullets.length > 0 ? (
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            {bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : null}
      </article>
    </>
  );
}
