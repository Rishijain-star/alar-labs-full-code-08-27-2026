import { useState } from "react";
import { Button } from "../../../components/ui/button";
import Voucher from "../../../components/Vourcher";
import { Input } from "../../../components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { useCreateVoucherMutation } from "@/store/api/voucherApi";

const VouchersCreate = () => {
  const [open, setOpen] = useState(false);
  const [createVoucher, { isLoading }] = useCreateVoucherMutation();
  const [form, setForm] = useState({
    code: "",
    title: "",
    provider: "",
    original_price: "0",
    discount_type: "percent",
    discount_value: "0",
    expires_at: "",
  });
  return (
    <div>
      <div className="flex justify-start mb-4">
        <Button variant="default" onClick={() => setOpen(true)}>
          Create Voucher
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Voucher</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            <Input placeholder="Provider" value={form.provider} onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))} />
            <Input placeholder="Original price" type="number" value={form.original_price} onChange={(e) => setForm((p) => ({ ...p, original_price: e.target.value }))} />
            <Input placeholder="Discount type (percent/flat)" value={form.discount_type} onChange={(e) => setForm((p) => ({ ...p, discount_type: e.target.value }))} />
            <Input placeholder="Discount value" type="number" value={form.discount_value} onChange={(e) => setForm((p) => ({ ...p, discount_value: e.target.value }))} />
            <Input placeholder="Expiry date" type="date" value={form.expires_at} onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={isLoading}
              onClick={async () => {
                await createVoucher(form).unwrap();
                setOpen(false);
              }}
            >
              {isLoading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Voucher is_admin={true} />
    </div>
  );
};

export default VouchersCreate;
