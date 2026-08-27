import CertificationPicker from "@/components/admin/CertificationPicker";
import FieldLabel from "@/components/ui/fieldlabel";
import { Input } from "@/components/ui/input";

/**
 * Certificate template picker + display title (labs and courses).
 */
export default function LabCertificateConfigFields({
  enabled,
  certificationId,
  certificateTitle,
  onCertificationIdChange,
  onCertificateTitleChange,
}) {
  if (!enabled) return null;

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Certificate Template</FieldLabel>
        <CertificationPicker
          value={certificationId}
          onChange={onCertificationIdChange}
          onSelectItem={(cert) => {
            if (cert?.title) onCertificateTitleChange(cert.title);
          }}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Pick a template from Certificates. The title updates when you select one.
        </p>
      </div>
      <div>
        <FieldLabel>Certificate Title</FieldLabel>
        <Input
          value={certificateTitle || ""}
          onChange={(e) => onCertificateTitleChange(e.target.value)}
          placeholder="e.g. HTML Portfolio Website Completion Certificate"
          className="bg-muted/30"
        />
      </div>
    </div>
  );
}
