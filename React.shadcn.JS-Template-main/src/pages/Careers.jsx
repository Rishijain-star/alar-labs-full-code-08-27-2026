import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Briefcase,
  CheckCircle2,
  ArrowRight,
  Loader2,
  X,
  Star,
} from "lucide-react";
import {
  useGetPublicCareerOfferingsQuery,
  useSubmitCareerRequestMutation,
} from "@/store/api/careerOfferingApi";
import RichTextContent from "@/components/learning/RichTextContent";
import { sanitizeCourseDescriptionHtml } from "@/lib/sanitizeCourseHtml";
import { stripHtmlToPlain } from "@/lib/stripHtml";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function CareersPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formSelectedOffering, setFormSelectedOffering] = useState(null);
  const [requestType, setRequestType] = useState("self");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailModalOffering, setDetailModalOffering] = useState(null);
  const { data: offeringsData, isLoading, error } = useGetPublicCareerOfferingsQuery();
  const [submitRequest, { isLoading: submitting }] = useSubmitCareerRequestMutation();

  const offerings = offeringsData?.data?.rows || [];

  const renderStarRating = (rating) => {
    const value = Number(rating) || 0;
    if (value <= 0) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i <= Math.round(value)
                ? "fill-amber-400 text-amber-400"
                : "fill-muted/20 text-muted-foreground/25"
            }`}
          />
        ))}
        <span className="text-sm font-semibold text-foreground ml-1.5">
          {value.toFixed(1)}
        </span>
      </div>
    );
  };

  const requestAccess = (offering) => {
    setFormSelectedOffering(offering);
    setRequestType("self");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const organization =
      requestType === "corporate"
        ? String(formData.get("organization") || "").trim()
        : "";

    if (requestType === "corporate" && !organization) {
      toast({
        title: "Organization required",
        description: "Please enter your organization name for corporate requests.",
        variant: "destructive",
      });
      return;
    }

    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      contact_number: formData.get("contact_number"),
      request_type: requestType,
      organization: organization || null,
      requirements: formData.get("requirements"),
      career_offering_id: formSelectedOffering?.id || null,
    };

    try {
      await submitRequest(data).unwrap();
      e.target.reset();
      setFormSelectedOffering(null);
      setRequestType("self");
      setIsModalOpen(false);
      toast({
        title: "Request submitted",
        description: "Our team will get back to you within 24 hours.",
      });
    } catch (err) {
      toast({
        title: "Submission failed",
        description: err?.data?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        Error loading career offerings. Please try again later.
      </div>
    );
  }

  return (
    <>
      <div>
        <main className="pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <div className="mb-4 flex items-center justify-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                  <Briefcase className="h-6 w-6 text-secondary" />
                </div>
              </div>
              <Badge className="mb-3 border-secondary/20 bg-secondary/10 text-secondary">
                Bridge to Hire
              </Badge>
              <h1 className="mb-4 text-3xl font-bold md:text-4xl">Tech Career Pathways</h1>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                Your roadmap to a successful tech career — crack interviews and stand out with
                industry-ready resumes.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="mb-6 text-2xl font-bold">Our Offerings</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {offerings.map((offering) => (
                  <Card key={offering.id} className="card-hover flex flex-col justify-between h-full shadow-sm border">
                    <div>
                      <CardHeader className="space-y-2.5 pb-3">
                        {renderStarRating(offering.rating)}
                        <CardTitle className="text-lg font-bold leading-snug line-clamp-2">
                          {offering.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 pb-2">
                        {stripHtmlToPlain(offering.description) ? (
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {stripHtmlToPlain(offering.description)}
                          </p>
                        ) : null}

                        {(() => {
                          let parsedItems = offering.items;
                          if (typeof parsedItems === "string") {
                            try {
                              parsedItems = JSON.parse(parsedItems);
                            } catch (e) {
                              /* ignore */
                            }
                          }

                          if (Array.isArray(parsedItems) && parsedItems.length > 0) {
                            const visibleItems = parsedItems.slice(0, 3);
                            const extraCount = parsedItems.length - 3;
                            return (
                              <div className="space-y-1.5 pt-1">
                                <ul className="space-y-1.5">
                                  {visibleItems.map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-foreground/90">
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                      <span className="line-clamp-1">{item}</span>
                                    </li>
                                  ))}
                                </ul>
                                {extraCount > 0 && (
                                  <p className="text-xs font-semibold text-secondary/90 pt-1">
                                    + {extraCount} more deliverable{extraCount > 1 ? "s" : ""} included
                                  </p>
                                )}
                              </div>
                            );
                          } else if (typeof parsedItems === "string" && stripHtmlToPlain(parsedItems)) {
                            return (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {stripHtmlToPlain(parsedItems)}
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </CardContent>
                    </div>

                    <CardContent className="pt-4 mt-auto border-t bg-slate-50/50 dark:bg-slate-900/30">
                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        onClick={() => navigate(`/careers/${offering.id}`)}
                      >
                        Add More Detail
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Global Request Modal */}
            <Dialog 
              open={isModalOpen} 
              onOpenChange={(open) => {
                if (!open) {
                  setFormSelectedOffering(null);
                  setRequestType("self");
                }
                setIsModalOpen(open);
              }}
            >
              <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Request Career Services</DialogTitle>
                  <DialogDescription>
                    Fill out the form below and our team will get back to you within 24 hours.
                  </DialogDescription>
                </DialogHeader>

                {formSelectedOffering && (
                  <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Selected offering
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {formSelectedOffering.title}
                      </p>
                    </div>
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="career-request-name" className="mb-1 block">
                        Name <span className="text-red-500">*</span>
                      </Label>
                      <Input id="career-request-name" placeholder="Your name" name="name" required />
                    </div>
                    <div>
                      <Label htmlFor="career-request-email" className="mb-1 block">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="career-request-email"
                        type="email"
                        placeholder="your@email.com"
                        name="email"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="career-request-phone" className="mb-1 block">
                      Contact Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="career-request-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      name="contact_number"
                      required
                      minLength={6}
                      maxLength={30}
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block">
                      Request Type <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <input
                          type="radio"
                          name="request_type_ui"
                          value="self"
                          checked={requestType === "self"}
                          onChange={() => setRequestType("self")}
                          className="accent-primary"
                        />
                        Self
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <input
                          type="radio"
                          name="request_type_ui"
                          value="corporate"
                          checked={requestType === "corporate"}
                          onChange={() => setRequestType("corporate")}
                          className="accent-primary"
                        />
                        Corporate
                      </label>
                    </div>
                  </div>

                  {requestType === "corporate" && (
                    <div>
                      <Label htmlFor="career-request-org" className="mb-1 block">
                        Organization Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="career-request-org"
                        placeholder="Company name"
                        name="organization"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="career-request-requirements" className="mb-1 block">
                      Requirements
                    </Label>
                    <Textarea
                      id="career-request-requirements"
                      placeholder="Describe your requirements..."
                      rows={4}
                      name="requirements"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Submit your Request <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            {/* Career Detail Popup Modal */}
            <Dialog open={!!detailModalOffering} onOpenChange={(open) => !open && setDetailModalOffering(null)}>
              <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto p-6">
                {detailModalOffering && (
                  <>
                    <DialogHeader className="space-y-3 pb-3 border-b">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge className="bg-secondary/10 text-secondary border-secondary/20">
                          Bridge to Hire
                        </Badge>
                        {renderStarRating(detailModalOffering.rating)}
                      </div>
                      <DialogTitle className="text-2xl font-bold text-foreground">
                        {detailModalOffering.title}
                      </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                      {/* Pathway Description */}
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-secondary" /> Pathway Details & Scope
                        </h4>
                        {stripHtmlToPlain(detailModalOffering.description) ? (
                          <RichTextContent
                            html={sanitizeCourseDescriptionHtml(detailModalOffering.description)}
                            showTitle={false}
                            className="text-sm text-foreground leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border"
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No description available.</p>
                        )}
                      </div>

                      {/* Deliverables & Support Included */}
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Deliverables & Support Included
                        </h4>
                        {(() => {
                          let parsedItems = detailModalOffering.items;
                          if (typeof parsedItems === "string") {
                            try { parsedItems = JSON.parse(parsedItems); } catch (e) { /* ignore */ }
                          }

                          if (Array.isArray(parsedItems) && parsedItems.length > 0) {
                            return (
                              <div className="grid sm:grid-cols-2 gap-2.5">
                                {parsedItems.map((item, idx) => (
                                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-md border bg-card text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          } else if (typeof parsedItems === "string" && stripHtmlToPlain(parsedItems)) {
                            return (
                              <RichTextContent
                                html={sanitizeCourseDescriptionHtml(parsedItems)}
                                showTitle={false}
                                className="text-sm bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border"
                              />
                            );
                          }
                          return <p className="text-sm text-muted-foreground italic">Placement support included.</p>;
                        })()}
                      </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          const oId = detailModalOffering.id;
                          setDetailModalOffering(null);
                          navigate(`/careers/${oId}`);
                        }}
                      >
                        Open in Dedicated Page →
                      </Button>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="outline" onClick={() => setDetailModalOffering(null)}>
                          Close
                        </Button>
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6"
                          onClick={() => {
                            const o = detailModalOffering;
                            setDetailModalOffering(null);
                            requestAccess(o);
                          }}
                        >
                          Request Pathway <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </>
  );
}
