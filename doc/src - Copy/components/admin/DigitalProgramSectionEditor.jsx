import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  useGetAdminSectionQuery,
  useUpsertSectionMutation,
} from "@/store/api/digitalProgramApi";
import { permissionStore } from "@/utils/permissions";

/**
 * @param {object} props
 * @param {string} props.sectionKey - backend key e.g. technology_readiness_assessment
 * @param {string} props.heading - Admin page title
 * @param {string} [props.description] - Help text under title
 */
export default function DigitalProgramSectionEditor({ sectionKey, heading, description }) {
  const canEdit = permissionStore.hasPermission("manage_programs");
  const { data, isLoading, isError, refetch } = useGetAdminSectionQuery(sectionKey);
  const [save, { isLoading: saving }] = useUpsertSectionMutation();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [html, setHtml] = useState("");
  const [bulletsText, setBulletsText] = useState("");
  const [published, setPublished] = useState(false);

  const section = data?.data?.section ?? data?.section;

  useEffect(() => {
    if (!section) return;
    setTitle(section.title || "");
    setSubtitle(section.subtitle || "");
    const body = section.body || {};
    setHtml(typeof body.html === "string" ? body.html : "");
    const bullets = Array.isArray(body.bullets) ? body.bullets : [];
    setBulletsText(bullets.join("\n"));
    setPublished(!!section.is_published);
  }, [section]);

  const handleSave = async () => {
    if (!canEdit) return;
    const bullets = bulletsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    await save({
      sectionKey,
      data: {
        title,
        subtitle: subtitle || null,
        body: { html, bullets, links: section?.body?.links || [] },
        is_published: published,
      },
    }).unwrap();
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-destructive text-sm">
        Could not load this section. Ensure you have <code>view_programs</code> or{" "}
        <code>manage_programs</code> and the API is running.
      </p>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold">{heading}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        ) : null}
        <p className="text-xs text-muted-foreground mt-2 font-mono">section_key: {sectionKey}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
          <CardDescription>
            Published content is shown on the public program pages. HTML is sanitized on display.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input
              id="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="html">Body (HTML)</Label>
            <Textarea
              id="html"
              rows={10}
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              disabled={!canEdit}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bullets">Bullet points (one per line)</Label>
            <Textarea
              id="bullets"
              rows={5}
              value={bulletsText}
              onChange={(e) => setBulletsText(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="pub"
              checked={published}
              onCheckedChange={setPublished}
              disabled={!canEdit}
            />
            <Label htmlFor="pub">Published on public site</Label>
          </div>
          {canEdit ? (
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              You need <code>manage_programs</code> to edit. View-only access.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
