import {
  Share2,
  Link2,
  Facebook,
  Twitter,
  Linkedin,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buildApprovalPreviewUrl, copyShareLink, openSocialShare } from "@/lib/shareContent";
import { useToast } from "@/hooks/use-toast";

const SHARE_BUTTONS = [
  { key: "copy", icon: Link2, bg: "bg-slate-100 hover:bg-slate-200", color: "text-slate-600" },
  { key: "facebook", icon: Facebook, bg: "bg-blue-600 hover:bg-blue-700", color: "text-white" },
  { key: "twitter", icon: Twitter, bg: "bg-sky-400 hover:bg-sky-500", color: "text-white" },
  { key: "linkedin", icon: Linkedin, bg: "bg-blue-700 hover:bg-blue-800", color: "text-white" },
  { key: "whatsapp", icon: MessageCircle, bg: "bg-green-500 hover:bg-green-600", color: "text-white" },
];

export default function ShareContentCard({ kind = "course", slug, title = "" }) {
  const { toast } = useToast();
  const shareUrl = buildApprovalPreviewUrl(kind, slug);
  const label = kind === "course" ? "Course" : "Lab";

  const handleShare = async (key) => {
    if (!shareUrl) {
      toast({
        title: "Cannot share",
        description: `This ${label.toLowerCase()} has no shareable link yet.`,
        variant: "destructive",
      });
      return;
    }
    if (key === "copy") {
      const ok = await copyShareLink(shareUrl);
      toast({
        title: ok ? "Link copied" : "Copy failed",
        description: ok ? shareUrl : "Could not copy link to clipboard.",
        variant: ok ? "default" : "destructive",
      });
      return;
    }
    openSocialShare(key, shareUrl, title);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Share2 className="w-4 h-4 text-violet-500" />
        <h3 className="text-sm font-bold text-slate-900">Share this {label}</h3>
      </div>
      <p className="text-xs text-slate-500 mb-3 leading-relaxed">
        Share this {label.toLowerCase()} with your friends and peers
      </p>
      <div className="flex items-center gap-2">
        {SHARE_BUTTONS.map(({ key, icon: Icon, bg, color }) => (
          <button
            key={key}
            type="button"
            title={key === "copy" ? shareUrl || "Copy link" : `Share on ${key}`}
            disabled={!slug}
            onClick={() => handleShare(key)}
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40",
              bg
            )}
          >
            <Icon className={cn("w-4 h-4", color)} />
          </button>
        ))}
      </div>
    </div>
  );
}
