import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetCertificationsQuery } from "@/store/api/certificationAdminApi";

/**
 * Dropdown to link a course/lab to a reusable certificate template.
 */
export default function CertificationPicker({
  value,
  onChange,
  onSelectItem,
  placeholder = "Select a certificate template (optional)",
  disabled = false,
  className,
}) {
  const { data, isLoading } = useGetCertificationsQuery(
    { page: 1, limit: 200, is_active: true },
    { refetchOnMountOrArgChange: false }
  );

  const rows =
    data?.data?.rows ||
    data?.data?.items ||
    data?.rows ||
    data?.items ||
    data?.data ||
    [];

  const selected = value ? String(value) : "";

  return (
    <Select
      value={selected}
      onValueChange={(v) => {
        const id = v === "__none__" ? null : v;
        onChange(id);
        if (onSelectItem) {
          const cert = id ? rows.find((c) => String(c.id) === String(id)) : null;
          onSelectItem(cert || null);
        }
      }}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className={className || "bg-muted/30"}>
        <SelectValue placeholder={isLoading ? "Loading certificates…" : placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">No linked template</SelectItem>
        {rows.map((cert) => (
          <SelectItem key={cert.id} value={String(cert.id)}>
            {cert.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
