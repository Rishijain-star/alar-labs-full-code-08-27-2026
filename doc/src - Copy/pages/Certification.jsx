import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Award,
  Search,
  Users,
  Lock,
  Loader2,
} from "lucide-react";
import { useGetPublicCertificationsQuery } from "@/store/api/certificationCatalogApi";
import { useGetPublicSectionsQuery } from "@/store/api/digitalProgramApi";
import { normalizeCoursesPayload } from "@/lib/normalizeApiPayload";
import { mapCertificationRow } from "@/lib/mapCertificationRow";

export default function CertificationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const { data: certRes, isLoading, isFetching } = useGetPublicCertificationsQuery(
    { limit: 48, page: 1 },
    { refetchOnMountOrArgChange: true }
  );
  const { data: sectionsRes } = useGetPublicSectionsQuery(undefined, { refetchOnMountOrArgChange: false });

  const cms = useMemo(() => {
    const list = sectionsRes?.data?.sections || [];
    if (!Array.isArray(list)) return null;
    return list.find((s) => s.section_key === "tech_career_pathways") || null;
  }, [sectionsRes]);

  const programs = useMemo(() => {
    const rows = normalizeCoursesPayload(certRes);
    return rows.map(mapCertificationRow);
  }, [certRes]);

  const platformOptions = useMemo(() => {
    const s = new Set(programs.map((p) => p.platform).filter(Boolean));
    return Array.from(s).sort();
  }, [programs]);

  const loading = isLoading || (isFetching && programs.length === 0);

  const filteredPrograms = programs.filter((program) => {
    const matchesSearch =
      program.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPrice =
      priceFilter === "all" ||
      (priceFilter === "free" && program.isFree) ||
      (priceFilter === "paid" && !program.isFree);

    const matchesPlatform =
      platformFilter === "all" || program.platform === platformFilter;

    return matchesSearch && matchesPrice && matchesPlatform;
  });

  return (
    <div>
      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <div>
                <Badge className="mb-1 bg-secondary/10 text-secondary">Invest In Your Future</Badge>
                <h1 className="text-3xl font-bold">
                  {cms?.title || "Certification Readiness Program"}
                </h1>
              </div>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              {cms?.subtitle ||
                "Comprehensive exam preparation with practice tests and study guides."}
            </p>
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
                <Input
                  className="pl-10"
                  placeholder="Search certification programs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All platforms</SelectItem>
                  {platformOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-12">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading programs…
              </div>
            ) : filteredPrograms.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8">
                No certification programs found. Add certifications in the admin catalog (active + catalog fields).
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPrograms.map((program) => (
                  <Card key={program.id} className="overflow-hidden">
                    <div className="relative aspect-video">
                      <img
                        src={program.thumbnail}
                        alt={program.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3">
                        <Badge>{program.isFree ? "FREE" : `$${program.price}`}</Badge>
                      </div>
                      {!program.isFree && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Lock className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>

                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">{program.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{program.description}</p>

                      <div className="flex justify-between items-center gap-2">
                        <span className="text-xs">
                          <Users className="w-3 h-3 inline mr-1" />
                          {Number(program.enrolledCount || 0).toLocaleString()}
                        </span>
                        <Button size="sm">{program.isFree ? "Start Now" : "View Details"}</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
