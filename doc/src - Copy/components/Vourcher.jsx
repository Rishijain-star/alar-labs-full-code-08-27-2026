import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Clock, Percent, ShoppingCart, Trash2 } from "lucide-react";
import {
  useDeleteVoucherMutation,
  useGetOwnerVouchersQuery,
  useGetPublicVouchersQuery,
  usePurchaseVoucherMutation,
} from "@/store/api/voucherApi";

export default function Voucher({ is_admin = false }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [purchaseVoucher, { isLoading: buying }] = usePurchaseVoucherMutation();
  const [deleteVoucher, { isLoading: deleting }] = useDeleteVoucherMutation();
  const { data: publicData, isLoading: loadingPublic } = useGetPublicVouchersQuery({ search: searchQuery });
  const { data: adminData, isLoading: loadingAdmin, refetch } = useGetOwnerVouchersQuery(
    { search: searchQuery },
    { skip: !is_admin }
  );
  const loading = is_admin ? loadingAdmin : loadingPublic;
  const rows = useMemo(() => {
    const payload = is_admin ? adminData : publicData;
    return payload?.data?.rows || [];
  }, [is_admin, adminData, publicData]);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search vouchers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading vouchers...</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rows.map((voucher) => {
              const original = Number(voucher.original_price || 0);
              const discounted = Number(voucher.discounted_price || 0);
              const discountPct = original > 0 ? Math.round(((original - discounted) / original) * 100) : 0;
              return (
                <Card key={voucher.id} className={`overflow-hidden ${!voucher.is_active ? "opacity-60" : "card-hover"}`}>
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 pb-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-background">
                        {voucher.code}
                      </Badge>
                      {discountPct > 0 ? (
                        <Badge className="bg-success text-success-foreground">
                          <Percent className="w-3 h-3 mr-1" />
                          {discountPct}% OFF
                        </Badge>
                      ) : null}
                    </div>
                    <CardTitle className="text-lg mt-2">{voucher.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{voucher.provider || "General"}</p>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-2xl font-bold text-foreground">${discounted.toFixed(2)}</div>
                        {original > discounted ? (
                          <div className="text-sm text-muted-foreground line-through">${original.toFixed(2)}</div>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Valid until
                        </div>
                        <div className="text-sm font-medium text-foreground">
                          {voucher.expires_at ? new Date(voucher.expires_at).toLocaleDateString() : "No expiry"}
                        </div>
                      </div>
                    </div>
                    {is_admin ? (
                      <Button
                        variant="destructive"
                        className="w-full"
                        disabled={deleting}
                        onClick={async () => {
                          await deleteVoucher(voucher.id).unwrap();
                          refetch();
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    ) : (
                      <Button
                        className="w-full gap-2"
                        disabled={!voucher.is_active || buying}
                        onClick={() => purchaseVoucher(voucher.id)}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Purchase Voucher
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
