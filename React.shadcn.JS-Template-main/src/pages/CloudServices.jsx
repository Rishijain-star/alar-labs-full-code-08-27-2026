import { useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
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
  X,
  Star,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useGetPublicCloudServicesQuery,
  useSubmitCloudServiceRequestMutation,
} from "@/store/api/cloudServiceApi";
import RichTextContent from "@/components/learning/RichTextContent";
import { sanitizeCourseDescriptionHtml } from "@/lib/sanitizeCourseHtml";
import { stripHtmlToPlain } from "@/lib/stripHtml";
import { useToast } from "@/hooks/use-toast";

export default function CloudServicesPage() {
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loginGateService, setLoginGateService] = useState(null);
  const [formSelectedService, setFormSelectedService] = useState(null);
  const [requestType, setRequestType] = useState("self");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: servicesData, isLoading, error } = useGetPublicCloudServicesQuery();
  const [submitRequest, { isLoading: submitting }] = useSubmitCloudServiceRequestMutation();

  const services = servicesData?.data?.rows || [];

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

  const requestAccess = (service) => {
    if (!isAuthenticated) {
      setLoginGateService(service);
      return;
    }
    setFormSelectedService(service);
    setRequestType("self");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setLoginGateService(formSelectedService);
      setIsModalOpen(false);
      toast({
        title: "Login required",
        description: "Please sign in before submitting a cloud service request.",
        variant: "destructive",
      });
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
      cloud_service_id: formSelectedService?.id || null,
    };

    try {
      await submitRequest(data).unwrap();
      e.target.reset();
      setFormSelectedService(null);
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
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
        Error loading cloud services. Please try again later.
      </div>
    );
  }

  return (
    <>
      <div>
        <main className="pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Cloud className="w-6 h-6 text-primary" />
                </div>
              </div>
              <Badge className="mb-3 bg-secondary/10 text-secondary border-secondary/20">
                Scale Without Limits
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Cloud Access Services
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Get help setting up and managing your cloud accounts with expert guidance.
                We provide end-to-end support for AWS, Azure, and GCP.
              </p>
            </div>

            {/* Services Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {services.map((service) => (
                  <Card key={service.id} className="card-hover flex flex-col">
                    <CardHeader className="space-y-3">
                      {renderStarRating(service.rating)}
                      <CardTitle className="text-lg leading-snug">{service.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {stripHtmlToPlain(service.description) ? (
                        <RichTextContent
                          html={sanitizeCourseDescriptionHtml(service.description)}
                          showTitle={false}
                          className="text-sm text-muted-foreground mb-4"
                        />
                      ) : null}
                      {(() => {
                        let parsedFeatures = service.features;
                        if (typeof parsedFeatures === "string") {
                          try { parsedFeatures = JSON.parse(parsedFeatures); } catch (e) { /* ignore */ }
                        }
                        
                        if (Array.isArray(parsedFeatures) && parsedFeatures.length > 0) {
                          return (
                            <ul className="space-y-2">
                              {parsedFeatures.map((feature) => (
                                <li key={feature} className="flex items-center gap-2 text-sm">
                                  <CheckCircle2 className="w-4 h-4 text-success" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        } else if (typeof parsedFeatures === "string" && stripHtmlToPlain(parsedFeatures)) {
                          return (
                            <RichTextContent
                              html={sanitizeCourseDescriptionHtml(parsedFeatures)}
                              showTitle={false}
                              className="text-sm text-muted-foreground"
                            />
                          );
                        }
                        return null;
                      })()}
                      <Button className="w-full mt-5" onClick={() => requestAccess(service)}>
                        {!isAuthenticated ? "Sign in to continue" : "Add More Detail"}
                      </Button>
                    </CardContent>
                  </Card>
              ))}
            </div>

          </div>
        </main>
      </div>

      <Dialog 
        open={isModalOpen} 
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setFormSelectedService(null);
            setRequestType("self");
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Cloud Services</DialogTitle>
            <DialogDescription>
              Fill out the form below and our team will get back to you within 24 hours.
            </DialogDescription>
          </DialogHeader>
          
          {formSelectedService && (
            <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Selected service
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {formSelectedService.title}
                </p>
              </div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cloud-request-name" className="mb-1 block">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input id="cloud-request-name" placeholder="Your name" name="name" required />
              </div>
              <div>
                <Label htmlFor="cloud-request-email" className="mb-1 block">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cloud-request-email"
                  type="email"
                  placeholder="your@email.com"
                  name="email"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cloud-request-phone" className="mb-1 block">
                Contact Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cloud-request-phone"
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
                <Label htmlFor="cloud-request-org" className="mb-1 block">
                  Organization Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cloud-request-org"
                  placeholder="Company name"
                  name="organization"
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="cloud-request-requirements" className="mb-1 block">
                Requirements
              </Label>
              <Textarea
                id="cloud-request-requirements"
                placeholder="Describe your requirements..."
                rows={4}
                name="requirements"
              />
            </div>

            <Button type="submit" className="w-full mt-2" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Submit your Request <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!loginGateService} onOpenChange={(open) => !open && setLoginGateService(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login required</DialogTitle>
            <DialogDescription>
              Please sign in to continue with &ldquo;{loginGateService?.title}&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoginGateService(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                navigate("/auth/login", {
                  state: { from: { pathname: location.pathname, search: location.search } },
                })
              }
            >
              Sign In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
