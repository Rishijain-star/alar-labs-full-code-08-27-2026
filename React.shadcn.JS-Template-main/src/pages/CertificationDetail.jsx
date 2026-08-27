import { useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Award,
  ArrowLeft,
  BookOpen,
  Beaker,
  Clock,
  Loader2,
} from "lucide-react";
import { useGetPublicCertificationByIdQuery } from "@/store/api/certificationCatalogApi";
import { PriceBadge } from "@/components/common/PriceBadge";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { resolveItemCurrency } from "@/lib/localeFormat";

const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500";

function stripHtmlToPlain(s) {
  if (s == null || s === "") return "";
  return String(s)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ContentCard({
  to,
  title,
  description,
  thumbnail,
  isFree,
  price,
  currency,
  icon: Icon,
  meta,
}) {
  return (
    <Link to={to} className="block">
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg">
        <div className="relative aspect-video bg-muted">
          <img
            src={resolveMediaUrl(thumbnail) || FALLBACK_THUMB}
            alt={title}
            className="h-full w-full object-cover"
          />
          <div className="absolute left-3 top-3">
            <PriceBadge
              isFree={isFree}
              price={Number(price ?? 0)}
              currency={currency}
            />
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="mb-1 line-clamp-2 font-semibold">{title}</h3>
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
            {stripHtmlToPlain(description)}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
            <span>{meta}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function CertificationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } =
    useGetPublicCertificationByIdQuery(id, {
      refetchOnMountOrArgChange: true,
    });

  const cert = data?.data?.certification || null;
  const courses = useMemo(
    () => (Array.isArray(cert?.courses) ? cert.courses : []),
    [cert],
  );
  const labs = useMemo(
    () => (Array.isArray(cert?.labs) ? cert.labs : []),
    [cert],
  );

  if (isLoading) {
    return (
      <main className="pb-16">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading certification…
        </div>
      </main>
    );
  }

  if (isError || !cert) {
    return (
      <main className="pb-16">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <Award className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
          <h2 className="mb-2 text-xl font-semibold">
            Certification not found
          </h2>
          <p className="mb-6 text-muted-foreground">
            {error?.message ||
              "This certification is unavailable or no longer active."}
          </p>
          <Button variant="outline" onClick={() => navigate("/certification")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to certifications
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-16">
      <div className="mx-auto max-w-7xl px-4">
        <Button
          variant="ghost"
          className="-ml-2 mb-4"
          onClick={() => navigate("/certification")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to certifications
        </Button>

        <div className="mb-10 flex flex-col gap-6 md:flex-row">
          <div className="shrink-0 md:w-72">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
              <img
                src={resolveMediaUrl(cert.thumbnail) || FALLBACK_THUMB}
                alt={cert.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute left-3 top-3">
                <PriceBadge
                  isFree={cert.is_free}
                  price={Number(cert.list_price ?? 0)}
                  currency={resolveItemCurrency(cert)}
                />
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Award className="h-5 w-5 text-primary" />
              </div>
              {cert.level ? <Badge variant="level">{cert.level}</Badge> : null}
              {cert.vendor_platform ? (
                <Badge variant="outline">{cert.vendor_platform}</Badge>
              ) : null}
            </div>
            <h1 className="mb-3 text-3xl font-bold">{cert.title}</h1>
            <p className="max-w-3xl text-muted-foreground">
              {stripHtmlToPlain(cert.description) ||
                "No description available."}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" /> {courses.length} courses
              </span>
              <span className="flex items-center gap-1">
                <Beaker className="h-4 w-4" /> {labs.length} labs
              </span>
              {cert.duration_label ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" /> {cert.duration_label}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Courses in this certification */}
        <section className="mb-12">
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-bold">
            <BookOpen className="h-5 w-5 text-primary" />
            Courses in this certification
          </h2>
          <p className="mb-5 text-muted-foreground">
            Complete these courses to work toward this certificate.
          </p>
          {courses.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No courses are linked to this certification yet.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <ContentCard
                  key={course.id}
                  to={`/courses/${course.slug}`}
                  title={course.title}
                  description={course.description}
                  thumbnail={course.thumbnail}
                  isFree={course.is_free}
                  price={course.price}
                  currency={resolveItemCurrency(course)}
                  icon={Clock}
                  meta={
                    course.duration_minutes
                      ? `${course.duration_minutes} min`
                      : "Self-paced"
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Labs in this certification */}
        <section>
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-bold">
            <Beaker className="h-5 w-5 text-primary" />
            Labs in this certification
          </h2>
          <p className="mb-5 text-muted-foreground">
            Hands-on labs included with this certificate.
          </p>
          {labs.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No labs are linked to this certification yet.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {labs.map((lab) => (
                <ContentCard
                  key={lab.id}
                  to={`/labs/${lab.slug}`}
                  title={lab.title}
                  description={lab.description}
                  thumbnail={lab.thumbnail}
                  isFree={lab.is_free}
                  price={lab.price}
                  currency={resolveItemCurrency(lab)}
                  icon={Beaker}
                  meta={lab.difficulty || "Lab"}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
