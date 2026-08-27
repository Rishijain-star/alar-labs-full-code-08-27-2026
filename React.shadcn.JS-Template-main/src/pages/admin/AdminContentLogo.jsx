import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import {
  useGetOwnerBrandingQuery,
  useUpdateOwnerBrandingMutation,
  useUploadSiteAssetMutation,
} from "@/store/api/siteContentApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";

/** Single global logo + favicon (drives public navbar & favicon). */
export default function AdminContentLogo() {
  const { data, isLoading } = useGetOwnerBrandingQuery();
  const [updateBranding, { isLoading: saving }] = useUpdateOwnerBrandingMutation();
  const [upload, { isLoading: uploading }] = useUploadSiteAssetMutation();
  const branding = data?.data?.branding;

  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");

  useEffect(() => {
    if (!branding) return;
    setLogoUrl(branding.logo_url || "");
    setFaviconUrl(branding.favicon_url || "");
  }, [branding]);

  const onPick = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await upload(fd).unwrap();
      const url = res?.data?.url;
      if (!url) return;
      if (field === "logo") setLogoUrl(url);
      else setFaviconUrl(url);
    } catch {
      /* toast */
    }
    e.target.value = "";
  };

  const save = async () => {
    await updateBranding({ logo_url: logoUrl, favicon_url: faviconUrl }).unwrap();
  };

  return (
    <Card className="border shadow-sm max-w-2xl">
      <CardHeader>
        <CardTitle>Logo & Favicon</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </p>
        ) : (
          <>
            <div>
              <label className="text-sm font-medium">Logo URL</label>
              <Input className="mt-1" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
              <Input type="file" accept="image/*" className="mt-2" onChange={(e) => onPick(e, "logo")} />
              {logoUrl ? (
                <img src={resolveMediaUrl(logoUrl)} alt="Logo preview" className="mt-3 h-14 object-contain border rounded p-2" />
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium">Favicon URL</label>
              <Input className="mt-1" value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} />
              <Input type="file" accept="image/*,.ico" className="mt-2" onChange={(e) => onPick(e, "favicon")} />
              {faviconUrl ? (
                <img src={resolveMediaUrl(faviconUrl)} alt="Favicon preview" className="mt-3 h-10 w-10 object-contain border rounded p-1" />
              ) : null}
            </div>
            <Button onClick={save} disabled={saving || uploading}>
              {(saving || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save branding
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
