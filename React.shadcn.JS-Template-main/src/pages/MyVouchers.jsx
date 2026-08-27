import React, { useState } from "react";
import { useGetOwnerVouchersQuery } from "@/store/api/voucherApi";
import { useGetMyPurchasedVouchersQuery } from "@/store/api/voucherApi"; // We will create this
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Tag, Loader2, ExternalLink } from "lucide-react";
import RichTextContent from "@/components/learning/RichTextContent";
import { stripHtmlToPlain } from "@/lib/stripHtml";

export default function MyVouchers() {
  const { data, isLoading, isError, refetch } = useGetMyPurchasedVouchersQuery();
  const rows = data?.data?.rows || data?.rows || [];
  const [expandedIds, setExpandedIds] = useState({});
  
  const toggleExpand = (id) => setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading your vouchers…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">My Exam Vouchers</h1>
        <p className="text-destructive">Could not load vouchers data. Try again.</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Exam Vouchers</h1>
        <p className="text-muted-foreground mt-1">
          Exam vouchers you have purchased for certifications.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Tag className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No Vouchers Found</h3>
            <p className="text-muted-foreground">You haven't purchased any exam vouchers yet.</p>
            <Button className="mt-4" onClick={() => window.location.href = '/vouchers'}>Browse Vouchers</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rows.map((purchase) => {
            const voucher = purchase.voucher || {};
            let metadata = voucher.metadata || {};
            if (typeof metadata === "string") {
              try { metadata = JSON.parse(metadata); } catch (e) { metadata = {}; }
            }
            const shortDesc = metadata.short_description || "";
            const isRedeemed = purchase.status === "redeemed";

            return (
              <Card key={purchase.id} className="overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={isRedeemed ? "secondary" : "default"} className={!isRedeemed ? "bg-green-600" : ""}>
                      {isRedeemed ? "Redeemed" : "Available"}
                    </Badge>
                    <Badge variant="outline">{voucher.provider || "General"}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground font-medium mb-1 tracking-wider uppercase">
                    Code: {voucher.code}
                  </div>
                  <CardTitle className="text-lg leading-tight line-clamp-2" title={voucher.title}>
                    {voucher.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="mt-auto py-4 space-y-4">
                  {shortDesc && (
                    <div className="mt-1">
                      <div className={`text-sm text-muted-foreground leading-relaxed relative overflow-hidden transition-all duration-300 [&_.rich-text-content_p]:mb-1 [&_.rich-text-content_p]:mt-0 [&_.rich-text-content_ul]:mt-0 [&_.rich-text-content_ul]:mb-1 [&_.rich-text-content_li]:mb-0 ${expandedIds[purchase.id] ? "" : "h-[7.5rem]"}`}>
                        <RichTextContent html={shortDesc} showTitle={false} />
                        {!expandedIds[purchase.id] && stripHtmlToPlain(shortDesc).length > 150 && (
                          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                        )}
                      </div>
                      {stripHtmlToPlain(shortDesc).length > 150 && (
                        <button 
                          onClick={(e) => { e.preventDefault(); toggleExpand(purchase.id); }}
                          className="text-xs text-primary font-medium mt-1 hover:underline focus:outline-none"
                        >
                          {expandedIds[purchase.id] ? "Show less" : "Show more"}
                        </button>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Purchased on:</span>
                      <span className="font-medium">{new Date(purchase.createdAt).toLocaleDateString()}</span>
                    </div>
                    {voucher.expires_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Valid until:</span>
                        <span className="font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(voucher.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {isRedeemed && purchase.redeemed_at && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Redeemed on:</span>
                        <span className="font-medium">{new Date(purchase.redeemed_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pt-0 pb-4">
                  {metadata.button_link ? (
                    <Button
                      className="w-full gap-2"
                      variant="outline"
                      onClick={() => window.open(metadata.button_link, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Redeem Voucher
                    </Button>
                  ) : (
                    <Button
                      className="w-full gap-2"
                      variant="secondary"
                      disabled
                    >
                      {isRedeemed ? "Already Redeemed" : "Ready to Use"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
