import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Video,
  Calendar,
  Clock,
  Users,
  Globe,
  MapPin,
  Link2,
  Loader2,
  Plus,
  X,
  Star,
} from "lucide-react";
import {
  useCreateOwnerWebinarMutation,
  useGetOwnerWebinarByIdQuery,
  useUpdateOwnerWebinarMutation,
  useUploadWebinarImageMutation,
} from "@/store/api/webinarApi";
import AdminContentDates from "@/components/admin/AdminContentDates";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { ensureFreshToken } from "@/lib/sessionActivity";
import { parseJsonStringArray } from "@/lib/parseJsonStringArray";
import { useUploadTrainingProgramBannerMutation } from "@/store/api/siteContentApi";
import QuillRichEditor from "@/components/editor/QuillRichEditor";
import { stripHtmlToPlain } from "@/lib/stripHtml";
import { isApprover } from "@/lib/auth";
import { toast } from "sonner";

const TIMEZONES = ["IST", "EST", "PST", "UTC", "GMT"];

function buildStartsAt(date, time) {
  if (!date) return null;
  const t = time || "09:00";
  const iso = `${date}T${t}:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const AdminWebinarCreate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const userIsApprover = isApprover();
  useEffect(() => {
    if (userIsApprover) {
      toast.error("Content Approvers are not permitted to create or edit webinars.");
      navigate("/app/live-webinar", { replace: true });
    }
  }, [userIsApprover, navigate]);

  const { data: existingRes, isLoading: loadingExisting } = useGetOwnerWebinarByIdQuery(editId, {
    skip: !editId,
  });
  const [createWebinar, { isLoading: creating }] = useCreateOwnerWebinarMutation();
  const [updateWebinar, { isLoading: updating }] = useUpdateOwnerWebinarMutation();
  const [uploadImage, { isLoading: uploadingImage }] = useUploadWebinarImageMutation();
  const [uploadBannerFallback] = useUploadTrainingProgramBannerMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [aboutContent, setAboutContent] = useState("");
  const [instructorName, setInstructorName] = useState("");
  const [instructorTitle, setInstructorTitle] = useState("");
  const [instructorImage, setInstructorImage] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [timezone, setTimezone] = useState("IST");
  const [maxAttendees, setMaxAttendees] = useState("100");
  const [isRecorded, setIsRecorded] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [originalPrice, setOriginalPrice] = useState("");
  const [price, setPrice] = useState("0");
  const [rating, setRating] = useState("4.8");
  const [deliveryMode, setDeliveryMode] = useState("online");
  const [meetingLink, setMeetingLink] = useState("");
  const [venue, setVenue] = useState("");
  const [badges, setBadges] = useState([]);
  const [badgeInput, setBadgeInput] = useState("");
  const [status, setStatus] = useState("draft");
  const hydratedWebinarIdRef = useRef(null);

  useEffect(() => {
    hydratedWebinarIdRef.current = null;
  }, [editId]);

  useEffect(() => {
    const w = existingRes?.data?.webinar;
    if (!w || !editId) return;
    if (hydratedWebinarIdRef.current === w.id) return;
    hydratedWebinarIdRef.current = w.id;
    setTitle(w.title || "");
    setDescription(w.description || "");
    setAboutContent(w.about_content || "");
    setInstructorName(w.instructor_name || "");
    setInstructorTitle(w.instructor_title || "");
    setInstructorImage(w.instructor_image || "");
    if (w.starts_at) {
      const d = new Date(w.starts_at);
      setDate(d.toISOString().slice(0, 10));
      setTime(d.toTimeString().slice(0, 5));
    }
    setDuration(String(w.duration_summary || "60").replace(/\D/g, "") || "60");
    setTimezone(w.timezone || "IST");
    setMaxAttendees(w.max_capacity != null ? String(w.max_capacity) : "100");
    setIsRecorded(Boolean(w.is_recorded));
    const free = Boolean(w.is_free) || Number(w.price) === 0;
    setIsPaid(!free);
    setOriginalPrice(w.original_price != null ? String(w.original_price) : "");
    setPrice(String(w.price ?? 0));
    setRating(String(w.rating ?? 4.8));
    setDeliveryMode(w.delivery_mode || "online");
    setMeetingLink(w.meeting_link || "");
    setVenue(w.venue || "");
    setBadges(parseJsonStringArray(w.topics));
    setStatus(w.status || "draft");
  }, [existingRes]);

  const addBadge = (value) => {
    const val = String(value || "").trim();
    if (!val) return;
    setBadges((prev) => (prev.includes(val) ? prev : [...prev, val]));
    setBadgeInput("");
  };

  const buildPayload = (publishStatus) => {
    const startsAt = buildStartsAt(date, time);
    const scheduleSummary = date
      ? new Date(date).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      : null;
    const timeSummary = time ? `${time} ${timezone}` : null;
    return {
      title: title.trim(),
      description: stripHtmlToPlain(description) ? description : null,
      about_content: stripHtmlToPlain(aboutContent) ? aboutContent : null,
      instructor_name: instructorName.trim() || "Instructor",
      instructor_title: instructorTitle.trim() || null,
      instructor_image: instructorImage.trim() || null,
      rating: Number(rating) || 4.8,
      price: isPaid ? Number(price) || 0 : 0,
      original_price:
        isPaid && originalPrice !== "" ? Number(originalPrice) || null : null,
      is_free: !isPaid,
      schedule_summary: scheduleSummary,
      time_summary: timeSummary,
      duration_summary: duration ? `${duration} minutes` : null,
      max_capacity: maxAttendees ? parseInt(maxAttendees, 10) : null,
      topics: [...badges],
      status: publishStatus,
      starts_at: startsAt,
      delivery_mode: deliveryMode,
      meeting_link: meetingLink.trim() || null,
      venue: venue.trim() || null,
      timezone,
      is_recorded: isRecorded,
      currency: "INR",
    };
  };

  const handleProfileImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      await ensureFreshToken();
      let res;
      try {
        res = await uploadImage(fd).unwrap();
      } catch (err) {
        const status = err?.status ?? err?.data?.status;
        const msg = String(err?.data?.message || err?.message || "");
        const isMissingRoute = status === 404 || /route not found/i.test(msg);
        if (!isMissingRoute) throw err;
        res = await uploadBannerFallback(fd).unwrap();
      }
      const url = res?.data?.url;
      if (url) setInstructorImage(url);
    } catch {
      /* toast from RTK */
    }
    e.target.value = "";
  };

  const handleSave = async (publishStatus) => {
    if (!title.trim()) return;
    if (isPaid && !(Number(price) > 0)) return;
    const payload = buildPayload(publishStatus);
    try {
      if (editId) {
        const res = await updateWebinar({ id: editId, ...payload }).unwrap();
        navigate(`/app/webinar/${res?.data?.webinar?.id || editId}`);
      } else {
        const res = await createWebinar(payload).unwrap();
        const id = res?.data?.webinar?.id;
        navigate(id ? `/app/webinar/${id}` : "/app/live-webinar");
      }
    } catch {
      /* toast from RTK */
    }
  };

  const saving = creating || updating;

  if (editId && loadingExisting) {
    return <p className="p-8 text-muted-foreground">Loading webinar…</p>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Button
        variant="ghost"
        className="mb-4 text-muted-foreground"
        onClick={() => navigate("/app/live-webinar")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Webinars
      </Button>

      <h1 className="text-2xl font-bold">{editId ? "Edit Webinar" : "Create New Webinar"}</h1>
      {editId && existingRes?.data?.webinar ? (
        <AdminContentDates record={existingRes.data.webinar} className="mt-1 mb-6" />
      ) : (
        <div className="mb-6" />
      )}

      <div className="space-y-6">
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Video className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Webinar Details</h3>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Webinar Title <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Introduction to Cloud Architecture"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-muted/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Header description</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Short rich text shown in the hero banner at the top of the webinar page.
                </p>
                <QuillRichEditor
                  editorKey={editId ? `${editId}-header` : "new-webinar-header"}
                  value={description}
                  onChange={setDescription}
                  placeholder="Brief summary for the page header…"
                  minHeight={160}
                  maxHeight={320}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">About this webinar</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Full content for the &quot;About this webinar&quot; section — bullets, numbered lists, colors, and images appear exactly as in the editor.
                </p>
                <QuillRichEditor
                  editorKey={editId ? `${editId}-about` : "new-webinar-about"}
                  value={aboutContent}
                  onChange={setAboutContent}
                  placeholder="What attendees will learn, agenda, prerequisites…"
                  minHeight={220}
                  maxHeight={480}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Instructor name</label>
                  <Input value={instructorName} onChange={(e) => setInstructorName(e.target.value)} className="bg-muted/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Instructor title</label>
                  <Input value={instructorTitle} onChange={(e) => setInstructorTitle(e.target.value)} className="bg-muted/30" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Speaker profile picture</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Shown on the public webinar detail page next to the speaker name.
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted/30 overflow-hidden shrink-0 flex items-center justify-center">
                    {instructorImage ? (
                      <img
                        src={resolveMediaUrl(instructorImage)}
                        alt="Speaker preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-muted-foreground text-center px-1">No photo</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImage}
                      onChange={handleProfileImage}
                      className="bg-muted/30"
                    />
                    {uploadingImage ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Uploading…
                      </p>
                    ) : null}
                    {instructorImage ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground"
                        onClick={() => setInstructorImage("")}
                      >
                        Remove photo
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Badges</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Add custom badges shown on the webinar overview page (e.g. DevOps, Azure, Beginner).
                  Save or publish the webinar for badges to appear on the public page.
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {badges.map((badge, i) => (
                    <Badge key={i} className="flex items-center gap-1">
                      {badge}
                      <button
                        type="button"
                        onClick={() => setBadges((prev) => prev.filter((_, idx) => idx !== i))}
                        className="ml-0.5"
                        aria-label={`Remove ${badge}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a badge (press Enter)"
                    value={badgeInput}
                    onChange={(e) => setBadgeInput(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addBadge(badgeInput);
                      }
                    }}
                    className="bg-muted/30"
                  />
                  <Button type="button" variant="outline" onClick={() => addBadge(badgeInput)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500" />
                  Star rating
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Shown on the public webinar page (1.0 – 5.0).
                </p>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="bg-muted/30 w-32"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Globe className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Location & format</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Delivery mode</label>
                <Select value={deliveryMode} onValueChange={setDeliveryMode}>
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online (live stream)</SelectItem>
                    <SelectItem value="offline">Offline (in-person venue)</SelectItem>
                    <SelectItem value="hybrid">Hybrid (online + venue)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(deliveryMode === "online" || deliveryMode === "hybrid") && (
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Link2 className="w-4 h-4" /> Meeting link
                  </label>
                  <Input
                    placeholder="https://teams.microsoft.com/..."
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    className="bg-muted/30"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Shown to registered attendees only on the public page.</p>
                </div>
              )}
              {(deliveryMode === "offline" || deliveryMode === "hybrid") && (
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Venue address
                  </label>
                  <Textarea
                    placeholder="Building, street, city"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="bg-muted/30 min-h-[80px]"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Schedule</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-muted/30" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Time</label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-muted/30" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="bg-muted/30" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Timezone</label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Settings</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Maximum attendees</label>
                <Input
                  type="number"
                  value={maxAttendees}
                  onChange={(e) => setMaxAttendees(e.target.value)}
                  className="bg-muted/30 w-40"
                />
              </div>
              <div className="flex items-center justify-between py-3 border-t">
                <div>
                  <p className="font-medium">Record webinar</p>
                  <p className="text-sm text-muted-foreground">Save recording for later access</p>
                </div>
                <Switch checked={isRecorded} onCheckedChange={setIsRecorded} />
              </div>
              <div className="flex items-center justify-between py-3 border-t">
                <div>
                  <p className="font-medium">Paid webinar</p>
                  <p className="text-sm text-muted-foreground">Charge attendees via Razorpay</p>
                </div>
                <Switch checked={isPaid} onCheckedChange={setIsPaid} />
              </div>
              {isPaid && (
                <div className="space-y-3 pl-4 border-l-2 border-muted">
                  <div>
                    <label className="block text-sm font-medium mb-2">Original price (INR)</label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={originalPrice}
                        onChange={(e) => setOriginalPrice(e.target.value)}
                        placeholder="e.g. 1999"
                        className="w-40"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Optional. Shown with strikethrough when higher than the discount price.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Discount price (INR)</label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-40"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Amount charged at checkout. Must be greater than 0 for paid webinars.
                    </p>
                  </div>
                </div>
              )}
              <div className="pt-3 border-t">
                <label className="block text-sm font-medium mb-2">Publish status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-muted/30 w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={() => navigate("/app/live-webinar")}>
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" disabled={saving} onClick={() => handleSave("draft")}>
              Save as Draft
            </Button>
            <Button disabled={saving || !title.trim()} onClick={() => handleSave(status)}>
              {status === "published" ? "Publish Webinar" : status === "cancelled" ? "Save as Cancelled" : "Save Webinar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminWebinarCreate;
