import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { checkoutVoucherPayment } from "@/lib/razorpayCheckout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Clock, ShoppingCart, Trash2, Edit, ExternalLink, Image as ImageIcon, CheckCircle, Minus, Plus } from "lucide-react";
import { confirmDelete } from "@/lib/confirmAction";
import {
  useDeleteVoucherMutation,
  useGetOwnerVouchersQuery,
  useGetPublicVouchersQuery,
  usePurchaseVoucherMutation,
} from "@/store/api/voucherApi";
import RichTextContent from "@/components/learning/RichTextContent";
import { stripHtmlToPlain } from "@/lib/stripHtml";

export default function Voucher({ is_admin = false, onEdit }) {
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [buyingId, setBuyingId] = useState(null);
  const [expandedIds, setExpandedIds] = useState({});
  const [quantities, setQuantities] = useState({});
  const [selectedVoucher, setSelectedVoucher] = useState(null);

  const toggleExpand = (id) => setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  const updateQty = (id, delta) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta)
    }));
  };

  const [deleteVoucher, { isLoading: deleting }] = useDeleteVoucherMutation();
  
  const { data: publicData, isLoading: loadingPublic, refetch: refetchPublic } = useGetPublicVouchersQuery({ search: searchQuery });
  const { data: adminData, isLoading: loadingAdmin, refetch: refetchAdmin } = useGetOwnerVouchersQuery(
    { search: searchQuery },
    { skip: !is_admin }
  );
  
  const loading = is_admin ? loadingAdmin : loadingPublic;
  const rows = useMemo(() => {
    const payload = is_admin ? adminData : publicData;
    return payload?.data?.rows || [];
  }, [is_admin, adminData, publicData]);

  const handleBuy = async (voucher) => {
    if (voucher.metadata?.button_link) {
      window.open(voucher.metadata.button_link, '_blank');
      return;
    }
    
    if (!isAuthenticated) {
      navigate('/auth/login?redirect=/vouchers');
      return;
    }
    
    try {
      setBuyingId(voucher.id);
      await checkoutVoucherPayment({
        voucherId: voucher.id,
        voucherTitle: voucher.title,
        userEmail: user?.email,
        userName: user?.full_name || user?.name,
        quantity: quantities[voucher.id] || 1,
      });
      if (is_admin) refetchAdmin();
      else refetchPublic();
    } catch (err) {
      console.error(err);
      if (err.message && err.message !== "Payment cancelled") {
        alert(err.message);
      }
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="flex flex-col">
      <main className="w-full flex-1">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search exam vouchers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-80 bg-muted/20 animate-pulse rounded-xl border" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No Vouchers Found</h3>
            <p className="text-muted-foreground">Try adjusting your search or check back later.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rows.map((voucher) => {
              const original = Number(voucher.original_price || 0);
              const discounted = Number(voucher.discounted_price || 0);
              const discountPct = original > 0 ? Math.round(((original - discounted) / original) * 100) : 0;
              let metadata = voucher.metadata || {};
              if (typeof metadata === "string") {
                try { metadata = JSON.parse(metadata); } catch (e) { metadata = {}; }
              }
              const imageUrl = metadata.image;
              const shortDesc = metadata.short_description || "";
              const btnText = metadata.button_text || "Buy Now";
              const hasExternalLink = !!metadata.button_link;
              const currency = metadata.currency || "INR";
              const formatPrice = (price) => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(price);
              const isPurchased = voucher.is_purchased;
              const qty = quantities[voucher.id] || 1;
              return (
                <Card key={voucher.id} className={`overflow-hidden flex flex-col group relative ${!voucher.is_active ? "opacity-60 grayscale-[0.5]" : "hover:shadow-xl transition-all duration-300"}`}>
                  
                  {/* Discount Ribbon */}
                  {discountPct > 0 && voucher.is_active && (
                    <div className="absolute -right-12 top-6 bg-destructive text-destructive-foreground font-bold py-1 px-12 transform rotate-45 shadow-md z-10 text-sm tracking-wider">
                      {discountPct}% OFF
                    </div>
                  )}

                  <div className={`relative ${is_admin ? 'h-24' : 'h-48'} bg-muted overflow-hidden`}>
                    {is_admin && (
                      <div className="absolute top-2 right-2 flex gap-1 z-20">
                        <Button size="icon" variant="secondary" className="w-7 h-7 bg-background/90 hover:bg-background shadow-sm" onClick={() => onEdit?.(voucher)}>
                          <Edit className="w-3.5 h-3.5 text-foreground" />
                        </Button>
                        <Button size="icon" variant="destructive" className="w-7 h-7 shadow-sm" disabled={deleting} onClick={async () => {
                          if (await confirmDelete("this voucher")) {
                            await deleteVoucher(voucher.id).unwrap();
                            if (is_admin) refetchAdmin();
                            else refetchPublic();
                          }
                        }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={voucher.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-secondary/10">
                        <ImageIcon className="w-8 h-8 mb-1 opacity-50" />
                        <span className="text-xs font-medium">No Image</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm hover:bg-background/100 border-none shadow-sm text-foreground text-[10px] px-2 py-0 h-5">
                        {voucher.provider || "General"}
                      </Badge>
                      {is_admin && !voucher.is_active && (
                        <Badge variant="destructive" className="shadow-sm text-[10px] px-2 py-0 h-5">Inactive</Badge>
                      )}
                      {is_admin && (
                        <Badge variant="default" className="bg-primary shadow-sm text-[10px] px-2 py-0 h-5">
                          {voucher.purchase_count || 0} Sold
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardHeader className="pb-3 flex-none">
                    <div className="text-[10px] text-muted-foreground font-semibold mb-1 tracking-wider uppercase">Code: {voucher.code}</div>
                    <CardTitle className="text-base leading-tight line-clamp-2" title={voucher.title}>
                      {voucher.title}
                    </CardTitle>
                    {shortDesc && (
                      <div className="mt-1">
                        <div className={`text-sm text-muted-foreground leading-relaxed relative overflow-hidden transition-all duration-300 [&_.rich-text-content_p]:mb-1 [&_.rich-text-content_p]:mt-0 [&_.rich-text-content_ul]:mt-0 [&_.rich-text-content_ul]:mb-1 [&_.rich-text-content_li]:mb-0 ${expandedIds[voucher.id] ? "" : (is_admin ? "h-[3.5rem]" : "h-[7.5rem]")}`}>
                          <RichTextContent html={shortDesc} showTitle={false} />
                          {!expandedIds[voucher.id] && stripHtmlToPlain(shortDesc).length > (is_admin ? 60 : 150) && (
                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                          )}
                        </div>
                        {stripHtmlToPlain(shortDesc).length > (is_admin ? 60 : 150) && (
                          <button 
                            onClick={(e) => { e.preventDefault(); toggleExpand(voucher.id); }}
                            className="text-xs text-primary font-medium mt-1 hover:underline focus:outline-none"
                          >
                            {expandedIds[voucher.id] ? "Show less" : "Show more"}
                          </button>
                        )}
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent className="mt-auto pb-4">
                    <div className="flex items-end justify-between">
                      <div>
                        {original > discounted && (
                          <div className="text-sm text-muted-foreground line-through mb-0.5">{formatPrice(original * qty)}</div>
                        )}
                        <div className="text-2xl font-bold text-foreground leading-none text-primary">
                          {formatPrice(discounted * qty)}
                        </div>
                      </div>
                      
                      {voucher.expires_at && (
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3" />
                            Valid until
                          </div>
                          <div className="text-sm font-medium text-foreground">
                            {new Date(voucher.expires_at).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0 pb-4 border-t border-border/50 pt-4 bg-muted/10 flex flex-col gap-3">
                    {is_admin ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open('/vouchers', '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View in Store
                      </Button>
                    ) : (
                      <Button
                        className="w-full gap-2 text-md font-semibold h-11"
                        variant="secondary"
                        onClick={() => setSelectedVoucher(voucher)}
                      >
                        More details
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={!!selectedVoucher} onOpenChange={(val) => !val && setSelectedVoucher(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {selectedVoucher && (() => {
            const v = selectedVoucher;
            const original = Number(v.original_price || 0);
            const discounted = Number(v.discounted_price || 0);
            const qty = quantities[v.id] || 1;
            let metadata = v.metadata || {};
            if (typeof metadata === "string") {
              try { metadata = JSON.parse(metadata); } catch (e) { metadata = {}; }
            }
            const shortDesc = metadata.short_description || "";
            const isPurchased = v.is_purchased || false;
            const hasExternalLink = Boolean(metadata.button_link);
            const btnText = metadata.button_text || "Buy Now";
            const currency = metadata.currency || "INR";
            const formatPrice = (price) => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(price);

            return (
              <>
                <DialogHeader>
                  <DialogTitle>{v.title}</DialogTitle>
                  <DialogDescription>Review voucher details before purchasing.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {metadata.image && (
                    <img src={metadata.image} alt={v.title} className="w-full h-48 object-cover rounded-md" />
                  )}
                  {shortDesc && (
                    <div className="text-sm text-foreground leading-relaxed bg-muted/30 p-4 rounded-lg">
                      <RichTextContent html={shortDesc} showTitle={false} />
                    </div>
                  )}
                  <div className="flex justify-between items-center bg-muted/20 p-4 rounded-lg border">
                    <div>
                      {original > discounted && (
                        <div className="text-sm text-muted-foreground line-through mb-0.5">{formatPrice(original * qty)}</div>
                      )}
                      <div className="text-2xl font-bold text-primary">{formatPrice(discounted * qty)}</div>
                    </div>
                    {!isPurchased && !hasExternalLink && v.is_active && (
                      <div className="flex items-center gap-3 bg-background border rounded-md px-3 py-2 shadow-sm">
                        <button
                          className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                          disabled={qty <= 1}
                          onClick={(e) => { e.preventDefault(); updateQty(v.id, -1); }}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-semibold w-6 text-center">{qty}</span>
                        <button
                          className="text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.preventDefault(); updateQty(v.id, 1); }}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    className={`w-full gap-2 text-md font-semibold h-11 ${isPurchased ? "bg-green-600 hover:bg-green-700" : ""}`}
                    disabled={!v.is_active || buyingId === v.id || isPurchased}
                    onClick={() => handleBuy(v)}
                  >
                    {isPurchased ? (
                      <><CheckCircle className="w-4 h-4" /> Enrolled</>
                    ) : hasExternalLink ? (
                      <><ExternalLink className="w-4 h-4" /> {buyingId === v.id ? "Processing..." : btnText}</>
                    ) : (
                      <><ShoppingCart className="w-4 h-4" /> {buyingId === v.id ? "Processing..." : btnText}</>
                    )}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
