import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Cloud,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Star,
  ArrowLeft,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useGetPublicCloudServicesQuery,
  useSubmitCloudServiceRequestMutation,
} from "@/store/api/cloudServiceApi";
import RichTextContent from "@/components/learning/RichTextContent";
import { sanitizeCourseDescriptionHtml } from "@/lib/sanitizeCourseHtml";
import { stripHtmlToPlain } from "@/lib/stripHtml";
import { useToast } from "@/hooks/use-toast";

export default function CloudServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);

  const [requestType, setRequestType] = useState("self");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const { data: servicesData, isLoading, error } = useGetPublicCloudServicesQuery();
  const [submitRequest, { isLoading: submitting }] = useSubmitCloudServiceRequestMutation();

  const services = servicesData?.data?.rows || [];
  const service = services.find((s) => String(s.id) === String(id));

  const renderStarRating = (rating) => {
    const value = Number(rating) || 0;
    if (value <= 0) return null;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-5 h-5 ${
              i <= Math.round(value)
                ? "fill-amber-400 text-amber-400"
                : "fill-muted/20 text-muted-foreground/25"
            }`}
          />
        ))}
        <span className="text-base font-bold text-foreground ml-2">
          {value.toFixed(1)} / 5.0
        </span>
      </div>
    );
  };

  const handleOpenRequestForm = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    setRequestType("self");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      setIsModalOpen(false);
      return;
    }
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
      cloud_service_id: service?.id || id,
    };

    try {
      await submitRequest(data).unwrap();
      e.target.reset();
      setIsModalOpen(false);
      toast({
        title: "Request submitted successfully!",
        description: "Our cloud team will contact you within 24 hours.",
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold">Cloud Service Not Found</h2>
        <p className="text-muted-foreground">
          The requested cloud service details could not be loaded or may no longer exist.
        </p>
        <Button variant="outline" asChild>
          <Link to="/cloud-services">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Cloud Access Services
          </Link>
        </Button>
      </div>
    );
  }

  let parsedFeatures = service.features;
  if (typeof parsedFeatures === "string") {
    try {
      parsedFeatures = JSON.parse(parsedFeatures);
    } catch (e) {
      /* ignore */
    }
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 shadow-inner">
        <div className="max-w-5xl mx-auto space-y-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white hover:bg-slate-800 -ml-2"
            onClick={() => navigate("/cloud-services")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Cloud Access Services
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-primary/20 text-primary-foreground border-primary/30">
              Cloud Access Services
            </Badge>
            {service.rating > 0 && renderStarRating(service.rating)}
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {service.title}
          </h1>
          <p className="text-slate-300 max-w-3xl text-base sm:text-lg">
            Complete management, architectural setup, and continuous infrastructure support tailored to your team.
          </p>

          <div className="pt-4 flex flex-wrap gap-4 items-center">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 shadow-lg"
              onClick={handleOpenRequestForm}
            >
              Request Cloud Services <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-2 space-y-8">
          {/* Description Section */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Cloud className="w-5 h-5 text-primary" /> Service Overview & Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stripHtmlToPlain(service.description) ? (
                <RichTextContent
                  html={sanitizeCourseDescriptionHtml(service.description)}
                  showTitle={false}
                  className="text-base text-foreground leading-relaxed"
                />
              ) : (
                <p className="text-muted-foreground text-sm">No detailed description provided.</p>
              )}
            </CardContent>
          </Card>

          {/* Features Section */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" /> Key Features & Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(parsedFeatures) && parsedFeatures.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {parsedFeatures.map((feature, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              ) : typeof parsedFeatures === "string" && stripHtmlToPlain(parsedFeatures) ? (
                <RichTextContent
                  html={sanitizeCourseDescriptionHtml(parsedFeatures)}
                  showTitle={false}
                  className="text-sm"
                />
              ) : (
                <p className="text-muted-foreground text-sm">Features list included with service setup.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Summary Card */}
        <div className="space-y-6">
          <Card className="shadow-md border-primary/20 bg-slate-50/40 dark:bg-slate-900/40 sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Service Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className="font-semibold">Enterprise SLA Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>24/7 Expert Cloud Engineers</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Self & Corporate Options</span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 font-semibold py-6 text-base"
                  onClick={handleOpenRequestForm}
                >
                  Request Cloud Services
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Response within 24 hours guaranteed
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Request Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Cloud Services</DialogTitle>
            <DialogDescription>
              Submit your cloud service requirements and our engineering team will handle setup.
            </DialogDescription>
          </DialogHeader>

          <div className="mb-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">Selected Service</p>
            <p className="text-sm font-semibold text-foreground">{service.title}</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="req-name" className="mb-1 block">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input id="req-name" placeholder="Your name" name="name" required />
              </div>
              <div>
                <Label htmlFor="req-email" className="mb-1 block">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="req-email"
                  type="email"
                  placeholder="your@email.com"
                  name="email"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="req-phone" className="mb-1 block">
                Contact Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="req-phone"
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
                <Label htmlFor="req-org" className="mb-1 block">
                  Organization Name <span className="text-red-500">*</span>
                </Label>
                <Input id="req-org" placeholder="Company name" name="organization" required />
              </div>
            )}

            <div>
              <Label htmlFor="req-requirements" className="mb-1 block">
                Requirements
              </Label>
              <Textarea
                id="req-requirements"
                placeholder="Describe your requirements..."
                rows={4}
                name="requirements"
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Submit Cloud Service Request <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Login Prompt Dialog */}
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login Required</DialogTitle>
            <DialogDescription>
              Please sign in to submit a service request for &ldquo;{service.title}&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoginPrompt(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                navigate("/auth/login", {
                  state: { from: { pathname: `/cloud-services/${service.id}` } },
                })
              }
            >
              Sign In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
