import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Briefcase,
  FileText,
  MessageSquare,
  Target,
  BookOpen,
  Star,
  Users,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  useGetPublicCareerOfferingsQuery,
  useSubmitCareerRequestMutation,
} from "@/store/api/careerOfferingApi";

const iconMap = {
  Briefcase,
  FileText,
  MessageSquare,
  Target,
  BookOpen,
};

export default function CareersPage() {
  const [experienceType, setExperienceType] = useState("fresher");
  const [totalExperience, setTotalExperience] = useState("");
  const { data: offeringsData, isLoading, error } = useGetPublicCareerOfferingsQuery();
  const [submitRequest, { isLoading: submitting }] = useSubmitCareerRequestMutation();

  const offerings = offeringsData?.data?.rows || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      experience_type: experienceType,
      total_experience_years: experienceType === "experienced" ? Number(totalExperience) || null : null,
    };
    await submitRequest(data).unwrap();
    e.target.reset();
    setTotalExperience("");
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
        Error loading career offerings. Please try again later.
      </div>
    );
  }

  return (
    <div>
      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-secondary" />
              </div>
            </div>

            <Badge className="mb-3 bg-secondary/10 text-secondary border-secondary/20">
              Bridge to Hire
            </Badge>

            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Tech Career Pathways
            </h1>

            <p className="text-muted-foreground max-w-2xl mx-auto">
              Your Roadmap to a Successful Tech Career
            </p>

            <div className="flex justify-center gap-6 mt-6 text-sm">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-secondary fill-secondary" />
                <span className="font-medium">4.9 Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="font-medium">5,000+ Professionals Enrolled</span>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left */}
            <div className="lg:col-span-2 space-y-8">
              <p className="text-xl font-medium">
                Crack technical interviews and stand out with industry-ready
                resumes — designed for all experience levels.
              </p>

              {/* Offerings */}
              <div>
                <h2 className="text-2xl font-bold mb-6">Our Offerings</h2>
                <div className="grid sm:grid-cols-2 gap-6">
                  {offerings.map((offering) => {
                    const Icon = iconMap[offering.icon] || Briefcase;
                    return (
                      <Card key={offering.id}>
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <CardTitle>{offering.title}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {Array.isArray(offering.items) &&
                              offering.items.map((item) => (
                                <li key={item} className="flex gap-2 text-sm">
                                  <CheckCircle2 className="w-4 h-4 text-success mt-1" />
                                  {item}
                                </li>
                              ))}
                          </ul>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Form */}
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Get in Touch</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <Label>Name</Label>
                    <Input placeholder="Your full name" name="name" required />
                  </div>

                  <div>
                    <Label>Email</Label>
                    <Input type="email" placeholder="your@email.com" name="email" required />
                  </div>

                  <div>
                    <Label>Experience Level</Label>
                    <RadioGroup
                      value={experienceType}
                      onValueChange={setExperienceType}
                      className="flex gap-4 mt-2"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="fresher" />
                        <Label>Fresher</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="experienced" />
                        <Label>Experienced</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {experienceType === "experienced" && (
                    <div>
                      <Label>Total Experience (years)</Label>
                      <Input
                        placeholder="e.g. 5"
                        type="number"
                        value={totalExperience}
                        onChange={(e) => setTotalExperience(e.target.value)}
                      />
                    </div>
                  )}

                  <Button className="w-full" type="submit" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Get in Touch <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
