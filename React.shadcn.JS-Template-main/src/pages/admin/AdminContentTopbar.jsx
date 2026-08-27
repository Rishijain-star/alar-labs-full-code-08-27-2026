import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import {
  useGetOwnerBrandingQuery,
  useUpdateOwnerBrandingMutation,
  useUploadSiteAssetMutation,
} from "@/store/api/siteContentApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";

const AdminContentTopbar = () => {
  const { data, isLoading } = useGetOwnerBrandingQuery();
  const [updateBranding, { isLoading: saving }] = useUpdateOwnerBrandingMutation();
  const [upload, { isLoading: uploading }] = useUploadSiteAssetMutation();
  const branding = data?.data?.branding;

  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!branding) return;
    setText(branding.topbar_text || "");
    setImageUrl(branding.topbar_image_url || "");
    setActive(!!branding.topbar_active);
  }, [branding]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await upload(fd).unwrap();
      const url = res?.data?.url;
      if (url) setImageUrl(url);
    } catch {
      /* toast */
    }
    e.target.value = "";
  };

  const save = async () => {
    await updateBranding({
      topbar_text: text,
      topbar_image_url: imageUrl,
      topbar_active: active,
    }).unwrap();
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Top Bar Content</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-w-xl">
        {isLoading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </p>
        ) : (
          <>
            <div>
              <label className="text-sm font-medium">Announcement text</label>
              <Textarea className="mt-1 min-h-[88px]" value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Image URL (optional)</label>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-1" />
              <Input type="file" accept="image/*" className="mt-2" onChange={onFile} />
              {imageUrl ? (
                <img src={resolveMediaUrl(imageUrl)} alt="" className="mt-2 h-12 object-contain border rounded p-1" />
              ) : null}
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Show on public site</p>
                <p className="text-xs text-muted-foreground">Appears above the main navigation</p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
            <Button onClick={save} disabled={saving || uploading}>
              {(saving || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminContentTopbar;
