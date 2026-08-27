import { useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Cloud,
  Server,
  Shield,
  Settings,
  Users,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useGetPublicCloudServicesQuery,
  useSubmitCloudServiceRequestMutation,
} from "@/store/api/cloudServiceApi";

const iconMap = { Cloud, Server, Shield, Settings, Users };

export default function CloudServicesPage() {
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedService, setSelectedService] = useState(null);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const { data: servicesData, isLoading, error } = useGetPublicCloudServicesQuery();
  const [submitRequest, { isLoading: submitting }] = useSubmitCloudServiceRequestMutation();

  const services = servicesData?.data?.rows || [];

  const requestAccess = (service) => {
    if (service?.requires_login && !isAuthenticated) {
      setSelectedService(service);
      return;
    }
    setSelectedServiceId(service.id);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      organization: formData.get("organization"),
      requirements: formData.get("requirements"),
      cloud_service_id: selectedServiceId || null,
    };
    await submitRequest(data).unwrap();
    e.target.reset();
    setSelectedServiceId(null);
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
        <main className="pt-24 pb-16">
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
              {services.map((service) => {
                const Icon = iconMap[service.icon] || Cloud;
                return (
                  <Card key={service.id} className="card-hover">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{service.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {service.description}
                      </p>
                      <ul className="space-y-2">
                        {Array.isArray(service.features) &&
                          service.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-success" />
                              <span>{feature}</span>
                            </li>
                          ))}
                      </ul>
                      <Button className="w-full mt-5" onClick={() => requestAccess(service)}>
                        {service.requires_login && !isAuthenticated ? "Sign in to continue" : "Request Service"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Contact Form */}
            <Card className="max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <CardTitle>Request Cloud Services</CardTitle>
                <p className="text-muted-foreground">
                  Fill out the form below and our team will get back to you within 24 hours.
                </p>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        Name
                      </label>
                      <Input placeholder="Your name" name="name" required />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        Email
                      </label>
                      <Input type="email" placeholder="your@email.com" name="email" required />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Organization
                    </label>
                    <Input placeholder="Company name" name="organization" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">
                      Requirements
                    </label>
                    <Textarea placeholder="Describe your requirements..." rows={4} name="requirements" />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Submit Request <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <Dialog open={!!selectedService} onOpenChange={(open) => !open && setSelectedService(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login required</DialogTitle>
            <DialogDescription>
              Please sign in to continue with `{selectedService?.title}`.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedService(null)}>
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
