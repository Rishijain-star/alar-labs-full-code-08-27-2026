import { Image as ImageIcon, Video, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import MediaUploader from "@/components/ui/media-uploader";

function FieldLabel({ children, hint }) {
  return (
    <div className="mb-1.5">
      <label className="text-sm font-semibold text-slate-700">{children}</label>
      {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
}

/**
 * Thumbnail image + intro video for lab/course overview (admin step 1).
 * value: { thumbnail, _thumbnailFile, introVideoUrl, _introVideoFile }
 */
export default function OverviewMediaUploadSection({ value, onChange, entityLabel = "Lab" }) {
  const v = value || {};
  const set = (field, val) => onChange({ ...v, [field]: val });

  const thumbPreview = v._thumbnailFile
    ? URL.createObjectURL(v._thumbnailFile)
    : v.thumbnail || "";

  return (
    <div className="space-y-6 w-full">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-slate-600" />
            <div>
              <p className="font-semibold text-slate-900">{entityLabel} thumbnail image</p>
              <p className="text-xs text-slate-500">Shown on catalog cards and overview hero (when no video).</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <MediaUploader
                accept="image"
                value={v._thumbnailFile || null}
                previewUrl={typeof v.thumbnail === "string" ? v.thumbnail : ""}
                onChange={(f) => {
                  set("_thumbnailFile", f);
                  if (!f && !v.thumbnail) set("thumbnail", "");
                }}
                maxMB={5}
                hint="JPG / PNG / WebP, max 5MB"
                showPreview={false}
              />
              <div>
                <FieldLabel hint="Or paste image URL">Image URL (optional)</FieldLabel>
                <Input
                  placeholder="https://..."
                  value={typeof v.thumbnail === "string" ? v.thumbnail : ""}
                  onChange={(e) => {
                    set("thumbnail", e.target.value);
                    set("_thumbnailFile", null);
                  }}
                />
              </div>
            </div>
            <div className="aspect-video rounded-lg border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
              {thumbPreview ? (
                <img src={thumbPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
              ) : (
                <p className="text-xs text-slate-400 text-center px-4">No thumbnail selected</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-slate-600" />
            <div>
              <p className="font-semibold text-slate-900">{entityLabel} intro video</p>
              <p className="text-xs text-slate-500">Plays in the overview hero card (replaces static image).</p>
            </div>
          </div>
          <MediaUploader
            accept="video"
            value={v._introVideoFile || null}
            previewUrl={v.introVideoUrl || ""}
            onChange={(f) => {
              set("_introVideoFile", f);
              if (!f) set("introVideoUrl", "");
            }}
            maxMB={500}
            hint="MP4 / WebM — converted to HLS (m3u8) on publish, max 500MB"
            showPreview={false}
          />
          <div>
            <FieldLabel hint="Or paste an existing HLS playlist URL">Video URL (optional)</FieldLabel>
            <Input
              placeholder="https://.../index.m3u8 or /api/labs/intro-media/..."
              value={v.introVideoUrl || ""}
              onChange={(e) => {
                set("introVideoUrl", e.target.value);
                set("_introVideoFile", null);
              }}
            />
          </div>
          {(v._thumbnailFile || v._introVideoFile) && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Files upload when you publish. They appear on the public overview and course/lab list.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
