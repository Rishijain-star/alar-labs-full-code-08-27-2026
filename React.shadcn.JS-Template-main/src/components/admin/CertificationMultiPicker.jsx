import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetCertificationsQuery } from "@/store/api/certificationAdminApi";
import { X } from "lucide-react";

function normalizeRows(data) {
  return (
    data?.data?.rows ||
    data?.data?.items ||
    data?.rows ||
    data?.items ||
    data?.data ||
    []
  );
}

/**
 * Pick multiple certifications from the database for assessment outcomes.
 */
export default function CertificationMultiPicker({
  value = [],
  onChange,
  disabled = false,
  className,
}) {
  const ids = Array.isArray(value) ? value.map(String) : [];
  const { data, isLoading } = useGetCertificationsQuery(
    { page: 1, limit: 200, is_active: true },
    { refetchOnMountOrArgChange: false },
  );

  const rows = normalizeRows(data);
  const selected = ids
    .map((id) => rows.find((r) => String(r.id) === id))
    .filter(Boolean);
  const available = rows.filter((r) => !ids.includes(String(r.id)));

  const add = (id) => {
    if (!id || ids.includes(String(id))) return;
    onChange([...ids, String(id)]);
  };

  const remove = (id) => onChange(ids.filter((x) => x !== String(id)));

  return (
    <div className={className || "space-y-2"}>
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((cert) => (
            <Badge key={cert.id} variant="secondary" className="gap-1 pr-1">
              {cert.title}
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 hover:bg-transparent"
                  onClick={() => remove(cert.id)}
                  aria-label={`Remove ${cert.title}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No certifications selected.</p>
      )}

      {!disabled && (
        <Select
          value=""
          onValueChange={add}
          disabled={isLoading || available.length === 0}
        >
          <SelectTrigger className="h-9 bg-muted/30">
            <SelectValue
              placeholder={
                isLoading
                  ? "Loading certifications…"
                  : available.length === 0
                    ? "All certifications added"
                    : "Add certification…"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {available.map((cert) => (
              <SelectItem key={cert.id} value={String(cert.id)}>
                {cert.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
