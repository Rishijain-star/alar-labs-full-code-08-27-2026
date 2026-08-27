import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { useGetAdminAssessmentConfigQuery, useUpsertAssessmentConfigMutation } from "@/store/api/assessmentApi";
import { permissionStore } from "@/utils/permissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function TechnologyReadinessAssessmentAdmin() {
  const canEdit = permissionStore.hasPermission("manage_programs");
  const { data, isLoading, isError, refetch } = useGetAdminAssessmentConfigQuery();
  const [upsert, { isLoading: saving }] = useUpsertAssessmentConfigMutation();

  const [config, setConfig] = useState({
    primaryInterests: [],
    specializationsByPath: {},
    cloudOptions: [],
    outcomesBySpecialization: {}
  });
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (data) {
      setConfig({
        primaryInterests: data.config?.primaryInterests || [],
        specializationsByPath: data.config?.specializationsByPath || {},
        cloudOptions: data.config?.cloudOptions || [],
        outcomesBySpecialization: data.config?.outcomesBySpecialization || {}
      });
      setIsPublished(data.isPublished);
    }
  }, [data]);

  const handleSave = async () => {
    if (!canEdit || !config) return;
    await upsert({ config, is_published: isPublished }).unwrap();
    refetch();
  };

  const handlePrimaryInterestChange = (index, field, value) => {
    const newPrimaryInterests = [...(config.primaryInterests || [])];
    newPrimaryInterests[index] = { ...newPrimaryInterests[index], [field]: value };
    setConfig({ ...config, primaryInterests: newPrimaryInterests });
  };

  const addPrimaryInterest = () => {
    const newId = `interest-${Date.now()}`;
    setConfig({
      ...config,
      primaryInterests: [
        ...(config.primaryInterests || []),
        { id: newId, label: "New Interest", icon: "HelpCircle" }
      ]
    });
  };

  const removePrimaryInterest = (index) => {
    const newPrimaryInterests = [...(config.primaryInterests || [])];
    newPrimaryInterests.splice(index, 1);
    setConfig({ ...config, primaryInterests: newPrimaryInterests });
  };

  const handleSpecializationChange = (primaryPath, index, field, value) => {
    const newSpecsByPath = { ...config.specializationsByPath };
    const specs = [...(newSpecsByPath[primaryPath] || [])];
    specs[index] = { ...specs[index], [field]: value };
    newSpecsByPath[primaryPath] = specs;
    setConfig({ ...config, specializationsByPath: newSpecsByPath });
  };

  const addSpecialization = (primaryPath) => {
    const newId = `spec-${Date.now()}`;
    const newSpecsByPath = { ...config.specializationsByPath };
    newSpecsByPath[primaryPath] = [
      ...(newSpecsByPath[primaryPath] || []),
      { id: newId, label: "New Specialization" }
    ];
    setConfig({ ...config, specializationsByPath: newSpecsByPath });
  };

  const removeSpecialization = (primaryPath, index) => {
    const newSpecsByPath = { ...config.specializationsByPath };
    const specs = [...(newSpecsByPath[primaryPath] || [])];
    specs.splice(index, 1);
    newSpecsByPath[primaryPath] = specs;
    setConfig({ ...config, specializationsByPath: newSpecsByPath });
  };

  const handleCloudOptionChange = (index, field, value) => {
    const newCloudOptions = [...(config.cloudOptions || [])];
    newCloudOptions[index] = { ...newCloudOptions[index], [field]: value };
    setConfig({ ...config, cloudOptions: newCloudOptions });
  };

  const addCloudOption = () => {
    const newId = `cloud-${Date.now()}`;
    setConfig({
      ...config,
      cloudOptions: [
        ...(config.cloudOptions || []),
        { id: newId, label: "New Cloud Option" }
      ]
    });
  };

  const removeCloudOption = (index) => {
    const newCloudOptions = [...(config.cloudOptions || [])];
    newCloudOptions.splice(index, 1);
    setConfig({ ...config, cloudOptions: newCloudOptions });
  };

  const handleOutcomeChange = (specId, field, value) => {
    const newOutcomes = { ...config.outcomesBySpecialization };
    const outcome = { ...newOutcomes[specId] };
    if (field === "skills" || field === "tools" || field === "certificationTitles") {
      outcome[field] = value.split("\n").map(s => s.trim()).filter(Boolean);
    } else {
      outcome[field] = value;
    }
    newOutcomes[specId] = outcome;
    setConfig({ ...config, outcomesBySpecialization: newOutcomes });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-destructive text-sm">
        Could not load assessment config. Ensure you have the correct permissions and the API is running.
      </p>
    );
  }

  const iconOptions = [
    "Server", "Code", "Cloud", "Shield", "Database", "Network",
    "TestTube", "Settings", "HelpCircle", "ClipboardCheck", "Star"
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-lg font-semibold">Technology Readiness Assessment</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure the assessment wizard steps, options, and recommended outcomes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Publishing</CardTitle>
          <CardDescription>Control whether this assessment is visible to users.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch
              id="published"
              checked={isPublished}
              onCheckedChange={setIsPublished}
              disabled={!canEdit}
            />
            <Label htmlFor="published">Published</Label>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="primary-interests">
        <TabsList className="w-full flex-wrap">
          <TabsTrigger value="primary-interests">Primary Interests (Step 1)</TabsTrigger>
          <TabsTrigger value="specializations">Specializations (Step 2)</TabsTrigger>
          <TabsTrigger value="cloud-options">Cloud Options (Step 3)</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes & Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="primary-interests" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Primary Interests</CardTitle>
                <CardDescription>Define the main interest areas users can choose from.</CardDescription>
              </div>
              {canEdit && (
                <Button type="button" onClick={addPrimaryInterest} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add Interest
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {(config?.primaryInterests || []).map((interest, index) => (
                <div key={interest.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                      <div className="space-y-2">
                        <Label>ID (for internal use)</Label>
                        <Input
                          value={interest.id}
                          onChange={(e) => handlePrimaryInterestChange(index, "id", e.target.value)}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Label (shown to user)</Label>
                        <Input
                          value={interest.label}
                          onChange={(e) => handlePrimaryInterestChange(index, "label", e.target.value)}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Icon</Label>
                        <Select
                          value={interest.icon}
                          onValueChange={(value) => handlePrimaryInterestChange(index, "icon", value)}
                          disabled={!canEdit}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {iconOptions.map((icon) => (
                              <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {canEdit && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removePrimaryInterest(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specializations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Specializations</CardTitle>
              <CardDescription>Define specializations for each primary interest area.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {(config?.primaryInterests || []).map((primaryInterest) => {
                  const specs = config?.specializationsByPath?.[primaryInterest.id] || [];
                  return (
                    <AccordionItem key={primaryInterest.id} value={primaryInterest.id}>
                      <AccordionTrigger className="text-left font-medium">
                        {primaryInterest.label}
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="flex justify-end">
                          {canEdit && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => addSpecialization(primaryInterest.id)}
                            >
                              <Plus className="w-4 h-4 mr-1" /> Add Specialization
                            </Button>
                          )}
                        </div>
                        <div className="space-y-3">
                          {specs.map((spec, index) => (
                            <div key={spec.id} className="flex items-center gap-3 p-3 border rounded-lg">
                              <div className="space-y-2 flex-1">
                                <Label>ID</Label>
                                <Input
                                  value={spec.id}
                                  onChange={(e) =>
                                    handleSpecializationChange(primaryInterest.id, index, "id", e.target.value)
                                  }
                                  disabled={!canEdit}
                                />
                              </div>
                              <div className="space-y-2 flex-1">
                                <Label>Label</Label>
                                <Input
                                  value={spec.label}
                                  onChange={(e) =>
                                    handleSpecializationChange(primaryInterest.id, index, "label", e.target.value)
                                  }
                                  disabled={!canEdit}
                                />
                              </div>
                              {canEdit && (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeSpecialization(primaryInterest.id, index)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cloud-options" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Cloud Platform Options</CardTitle>
                <CardDescription>Define the cloud platform preferences users can choose from.</CardDescription>
              </div>
              {canEdit && (
                <Button type="button" onClick={addCloudOption} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add Option
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {(config?.cloudOptions || []).map((option, index) => (
                <div key={option.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <Label>ID</Label>
                    <Input
                      value={option.id}
                      onChange={(e) => handleCloudOptionChange(index, "id", e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label>Label</Label>
                    <Input
                      value={option.label}
                      onChange={(e) => handleCloudOptionChange(index, "label", e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeCloudOption(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outcomes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Outcomes & Recommendations</CardTitle>
              <CardDescription>Configure the recommended career paths, skills, tools, and certifications for each specialization.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {Object.entries(config?.specializationsByPath || {}).map(([primaryPath, specs]) => {
                  const primaryInterest = config?.primaryInterests?.find(p => p.id === primaryPath);
                  return specs.map((spec) => (
                    <AccordionItem key={spec.id} value={spec.id}>
                      <AccordionTrigger className="text-left font-medium">
                        {primaryInterest?.label} → {spec.label}
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Career Title</Label>
                          <Input
                            value={config?.outcomesBySpecialization?.[spec.id]?.careerTitle || ""}
                            onChange={(e) => handleOutcomeChange(spec.id, "careerTitle", e.target.value)}
                            disabled={!canEdit}
                            placeholder="e.g., Cloud Engineer"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Skills (one per line)</Label>
                          <Textarea
                            value={(config?.outcomesBySpecialization?.[spec.id]?.skills || []).join("\n")}
                            onChange={(e) => handleOutcomeChange(spec.id, "skills", e.target.value)}
                            disabled={!canEdit}
                            rows={4}
                            placeholder="Linux&#10;Docker&#10;Kubernetes"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tools (one per line)</Label>
                          <Textarea
                            value={(config?.outcomesBySpecialization?.[spec.id]?.tools || []).join("\n")}
                            onChange={(e) => handleOutcomeChange(spec.id, "tools", e.target.value)}
                            disabled={!canEdit}
                            rows={4}
                            placeholder="VS Code&#10;Git&#10;Jenkins"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Certifications (one per line)</Label>
                          <Textarea
                            value={(config?.outcomesBySpecialization?.[spec.id]?.certificationTitles || []).join("\n")}
                            onChange={(e) => handleOutcomeChange(spec.id, "certificationTitles", e.target.value)}
                            disabled={!canEdit}
                            rows={4}
                            placeholder="AWS Solutions Architect&#10;CKA&#10;Terraform Associate"
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ));
                })}
                <AccordionItem value="default">
                  <AccordionTrigger className="text-left font-medium">
                    Default Outcome (fallback)
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Career Title</Label>
                      <Input
                        value={config?.outcomesBySpecialization?.default?.careerTitle || ""}
                        onChange={(e) => handleOutcomeChange("default", "careerTitle", e.target.value)}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Skills (one per line)</Label>
                      <Textarea
                        value={(config?.outcomesBySpecialization?.default?.skills || []).join("\n")}
                        onChange={(e) => handleOutcomeChange("default", "skills", e.target.value)}
                        disabled={!canEdit}
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tools (one per line)</Label>
                      <Textarea
                        value={(config?.outcomesBySpecialization?.default?.tools || []).join("\n")}
                        onChange={(e) => handleOutcomeChange("default", "tools", e.target.value)}
                        disabled={!canEdit}
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Certifications (one per line)</Label>
                      <Textarea
                        value={(config?.outcomesBySpecialization?.default?.certificationTitles || []).join("\n")}
                        onChange={(e) => handleOutcomeChange("default", "certificationTitles", e.target.value)}
                        disabled={!canEdit}
                        rows={4}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {canEdit && (
        <div className="flex justify-end">
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
