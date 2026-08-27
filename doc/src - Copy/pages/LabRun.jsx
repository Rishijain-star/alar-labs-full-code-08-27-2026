import { Link, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, ListOrdered, CheckCircle2, Copy } from "lucide-react";
import { useState } from "react";

export default function LabRun() {
  const { slug } = useParams();
  const [copied, setCopied] = useState(null);
  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  const tasks = [
    {
      title: "Task 1. Create EKS Cluster",
      steps: [
        {
          label: "Step 1. Create cluster",
          substeps: [
            {
              text: "Use eksctl to create the cluster.",
              code: `eksctl create cluster \\
  --name my-cluster \\
  --region us-west-2 \\
  --nodegroup-name standard-workers \\
  --node-type t3.medium \\
  --nodes 3`,
            },
          ],
        },
        {
          label: "Step 2. Configure kubectl",
          substeps: [
            {
              text: "Update kubeconfig for the new cluster.",
              code: `aws eks update-kubeconfig --name my-cluster --region us-west-2`,
            },
          ],
        },
        {
          label: "Step 3. Verify cluster",
          substeps: [
            {
              text: "Check nodes and cluster info.",
              code: `kubectl get nodes
kubectl cluster-info`,
            },
          ],
        },
      ],
    },
    {
      title: "Task 2. Deploy Sample App",
      steps: [
        {
          label: "Step 1. Create deployment",
          substeps: [
            {
              text: "Deploy nginx container.",
              code: `kubectl create deployment nginx --image=nginx`,
            },
          ],
        },
        {
          label: "Step 2. Expose service",
          substeps: [
            {
              text: "Expose using LoadBalancer.",
              code: `kubectl expose deployment nginx --port=80 --type=LoadBalancer`,
            },
          ],
        },
        {
          label: "Step 3. Access app",
          substeps: [
            {
              text: "Get external IP and open in browser.",
              code: `kubectl get services nginx`,
            },
          ],
        },
      ],
    },
  ];

  return (
    <div>
      <main className="pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to={`/labs/${slug}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Lab Details
          </Link>

          <div className="mb-6">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-semibold">Lab Instructions and Tasks</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Follow the tasks below in order. Each task includes clearly numbered steps and sub-steps.
            </p>
          </div>

          {/* Outline */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold">Outline</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tasks.map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{t.title}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks */}
          <div className="mt-6 space-y-6">
            {tasks.map((task, ti) => (
              <Card key={ti} className="border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">{ti + 1}</span>
                    <h2 className="text-lg font-semibold">{task.title}</h2>
                  </div>

                  <div className="space-y-4">
                    {task.steps.map((step, si) => (
                      <div key={si} className="p-4 rounded-xl bg-muted/30 border">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <p className="font-medium text-sm">{step.label}</p>
                        </div>
                        <div className="space-y-3">
                          {step.substeps.map((ss, ssi) => (
                            <div key={ssi} className="space-y-2">
                              <p className="text-sm text-muted-foreground">{ti + 1}.{si + 1}.{ssi + 1} {ss.text}</p>
                              {ss.code && (
                                <div className="bg-muted rounded-lg overflow-hidden border">
                                  <div className="flex items-center justify-between px-4 py-2 border-b">
                                    <span className="text-xs font-mono text-muted-foreground">bash</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-muted-foreground hover:text-foreground"
                                      onClick={() => copy(ss.code, `${ti}-${si}-${ssi}`)}
                                    >
                                      <Copy className="w-3.5 h-3.5 mr-1" />
                                      {copied === `${ti}-${si}-${ssi}` ? "Copied!" : "Copy"}
                                    </Button>
                                  </div>
                                  <pre className="p-4 overflow-x-auto">
                                    <code className="text-sm">{ss.code}</code>
                                  </pre>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
