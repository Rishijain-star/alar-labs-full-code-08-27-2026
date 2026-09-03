import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import Voucher from "@/components/Vourcher";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateVoucherMutation, useUpdateVoucherMutation } from "@/store/api/voucherApi";
import { useUploadSiteAssetMutation } from "@/store/api/siteContentApi";
import { Plus, Upload, Loader2 } from "lucide-react";
import QuillRichEditor from "@/components/editor/QuillRichEditor";

import { isStudent, isAdmin, isSuperAdmin } from "@/lib/auth";
import MyVouchers from "@/pages/MyVouchers";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD", "CAD"];

const VouchersCreate = () => {
  const isStudentUser = isStudent() && !isAdmin() && !isSuperAdmin();
  if (isStudentUser) {
    return <MyVouchers />;
  }

  const [open, setOpen] = useState(false);
  const fileInputRef = useRef(null);
  
  const [createVoucher, { isLoading: isCreating }] = useCreateVoucherMutation();
  const [updateVoucher, { isLoading: isUpdating }] = useUpdateVoucherMutation();
  const [uploadAsset, { isLoading: isUploading }] = useUploadSiteAssetMutation();
  
  const isLoading = isCreating || isUpdating;
  const [editingId, setEditingId] = useState(null);
  
  const [form, setForm] = useState({
    code: "",
    title: "",
    provider: "",
    original_price: "",
    discounted_price: "",
    currency: "INR",
    expires_at: "",
    image: "",
    short_description: "",
    button_text: "Buy Now",
    button_link: "",
    is_active: true,
  });

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await uploadAsset(formData).unwrap();
      const url = res?.data?.url || res?.url || "";
      if (url) setForm((p) => ({ ...p, image: url }));
    } catch (err) {
      console.error(err);
      alert("Failed to upload image.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleEdit = (voucher) => {
    const originalPrice = Number(voucher.original_price || 0);
    const discountValue = Number(voucher.discount_value || 0);
    setEditingId(voucher.id);
    
    let metadata = voucher.metadata || {};
    if (typeof metadata === "string") {
      try { metadata = JSON.parse(metadata); } catch (e) { metadata = {}; }
    }
    
    setForm({
      code: voucher.code || "",
      title: voucher.title || "",
      provider: voucher.provider || "",
      original_price: originalPrice,
      discounted_price: Math.max(0, originalPrice - discountValue),
      currency: metadata.currency || "INR",
      expires_at: voucher.expires_at ? new Date(voucher.expires_at).toISOString().split('T')[0] : "",
      image: metadata.image || "",
      short_description: metadata.short_description || "",
      button_text: metadata.button_text || "Buy Now",
      button_link: metadata.button_link || "",
      is_active: voucher.is_active,
    });
    setOpen(true);
  };

  const handleCreate = async () => {
    const originalPrice = parseFloat(form.original_price) || 0;
    const discountedPrice = parseFloat(form.discounted_price) || 0;
    const discountValue = Math.max(0, originalPrice - discountedPrice);

    const payload = {
      code: form.code,
      title: form.title,
      provider: form.provider,
      original_price: form.original_price,
      discount_type: "flat",
      discount_value: discountValue,
      expires_at: form.expires_at || null,
      is_active: form.is_active,
      metadata: {
        image: form.image,
        short_description: form.short_description,
        button_text: form.button_text,
        button_link: form.button_link,
        currency: form.currency,
      }
    };
    try {
      if (editingId) {
        await updateVoucher({ id: editingId, ...payload }).unwrap();
      } else {
        await createVoucher(payload).unwrap();
      }
      setOpen(false);
      setEditingId(null);
      setForm({
        code: "", title: "", provider: "", original_price: "", discounted_price: "", currency: "INR",
        expires_at: "", image: "", short_description: "", button_text: "Buy Now", button_link: "", is_active: true,
      });
    } catch (err) {
      console.error(err);
      alert(editingId ? "Failed to update voucher" : "Failed to create voucher");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Exam Vouchers</h1>
          <p className="text-sm text-muted-foreground">Manage discounted certification vouchers.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Voucher
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          setEditingId(null);
          setForm({
            code: "", title: "", provider: "", original_price: "", discounted_price: "", currency: "INR",
            expires_at: "", image: "", short_description: "", button_text: "Buy Now", button_link: "", is_active: true,
          });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Exam Voucher" : "Create New Exam Voucher"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Voucher Code</Label>
              <Input placeholder="e.g. AWS-2026-X8" value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Voucher Title</Label>
              <Input placeholder="AWS Certified Solutions Architect" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Short Description</Label>
              <QuillRichEditor 
                value={form.short_description} 
                onChange={(val) => setForm(p => ({ ...p, short_description: val }))} 
                placeholder="Brief description of the exam voucher..."
              />
            </div>
            
            <div className="space-y-2 col-span-2">
              <Label>Image</Label>
              <div className="flex gap-2 items-center">
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload Image
                </Button>
                <Input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                <span className="text-sm text-muted-foreground mx-2">OR</span>
                <Input placeholder="https://example.com/image.png" value={form.image} onChange={(e) => setForm(p => ({ ...p, image: e.target.value }))} className="flex-1" />
              </div>
              {form.image && (
                <div className="mt-2 w-32 h-20 rounded-md overflow-hidden bg-muted">
                  <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="space-y-2 col-span-2 sm:col-span-2">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm(p => ({ ...p, currency: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Original Price</Label>
              <Input placeholder="e.g. 150" type="number" value={form.original_price} onChange={(e) => setForm(p => ({ ...p, original_price: e.target.value }))} />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Discount Price</Label>
              <Input placeholder="e.g. 99" type="number" value={form.discounted_price} onChange={(e) => setForm(p => ({ ...p, discounted_price: e.target.value }))} />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Expiry Date (Optional)</Label>
              <Input type="date" value={form.expires_at} onChange={(e) => setForm(p => ({ ...p, expires_at: e.target.value }))} />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Button Text</Label>
              <Input placeholder="e.g. Buy Now" value={form.button_text} onChange={(e) => setForm(p => ({ ...p, button_text: e.target.value }))} />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Button Link (Optional)</Label>
              <Input placeholder="e.g. https://provider.com/checkout" value={form.button_link} onChange={(e) => setForm(p => ({ ...p, button_link: e.target.value }))} />
            </div>
            <div className="flex items-center space-x-2 col-span-2 mt-2">
              <Switch checked={form.is_active} onCheckedChange={(c) => setForm(p => ({ ...p, is_active: c }))} />
              <Label>Active Status</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={isLoading || !form.code || !form.title} onClick={handleCreate}>
              {isLoading ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update Voucher" : "Create Voucher")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Voucher is_admin={true} onEdit={handleEdit} />
    </div>
  );
};

export default VouchersCreate;
