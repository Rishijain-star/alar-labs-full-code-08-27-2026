
import { Badge } from "@/components/ui/badge";
import Vourcher from "../components/Vourcher";
import { Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VouchersPage() {

  return (
    <div >

      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Tag className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <Badge className="mb-1 bg-secondary/10 text-secondary border-secondary/20">
                  Unlock Your Potential
                </Badge>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                  Certification Voucher Hub
                </h1>
              </div>
            </div>
            <p className="text-muted-foreground max-w-2xl">
              Get discounted exam vouchers for top certifications. Save money on your certification journey.
            </p>
          </div>
          <Vourcher is_admin={false} />

          {/* Info Section */}
          <Card className="mt-12 bg-muted">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">How It Works</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    step: "1",
                    title: "Purchase Voucher",
                    description: "Select and purchase your exam voucher at a discounted price.",
                  },
                  {
                    step: "2",
                    title: "Receive Code",
                    description: "Get your unique voucher code via email within 24 hours.",
                  },
                  {
                    step: "3",
                    title: "Schedule Exam",
                    description: "Use the code when scheduling your exam on the provider's website.",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

    </div>
  );
}
