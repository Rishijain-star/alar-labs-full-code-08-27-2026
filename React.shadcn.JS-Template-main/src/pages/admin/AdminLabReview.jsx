import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useGetOwnerLabByIdQuery,
  useGetPublicLabQuery,
  useSetLabContentApprovalMutation,
} from "@/store/api/labApi";
import { toast } from "@/lib/toast";
import { Beaker } from "lucide-react";
import ContentApprovalReview from "@/components/admin/ContentApprovalReview";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseLabMetadata(raw) {
  if (raw == null || raw === "") return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return typeof p === "object" && p !== null && !Array.isArray(p) ? p : {};
    } catch {
      return {};
    }
  }
  return {};
}

export default function AdminLabReview() {
  const navigate = useNavigate();
  const { labSlug } = useParams();
  const isUuid = UUID_RE.test(labSlug || "");

  const { data: byIdRes, isLoading: loadingById, isError: errorById, error: errById } =
    useGetOwnerLabByIdQuery(labSlug, { skip: !labSlug || !isUuid });

  const { data: bySlugRes, isLoading: loadingBySlug, isError: errorBySlug, error: errBySlug } =
    useGetPublicLabQuery(labSlug, { skip: !labSlug || isUuid });

  const labFromSlug = bySlugRes?.data?.lab ?? bySlugRes?.data ?? null;
  const resolvedId = isUuid ? labSlug : labFromSlug?.id;

  const { data: ownerFromSlugRes, isLoading: loadingOwner } = useGetOwnerLabByIdQuery(resolvedId, {
    skip: !resolvedId || isUuid,
  });

  const lab = useMemo(() => {
    if (isUuid) return byIdRes?.data?.lab ?? null;
    return ownerFromSlugRes?.data?.lab ?? labFromSlug;
  }, [isUuid, byIdRes, ownerFromSlugRes, labFromSlug]);

  const [setLabApproval, { isLoading: isMutating }] = useSetLabContentApprovalMutation();

  const { approval, title, slug } = useMemo(() => {
    if (!lab) return { approval: "pending", title: "", slug: labSlug || "" };
    const meta = parseLabMetadata(lab.metadata);
    return {
      approval: meta.content_approval_status || "pending",
      title: lab.title,
      slug: lab.slug || labSlug,
    };
  }, [lab, labSlug]);

  const isLoading = isUuid
    ? loadingById && !lab
    : (loadingBySlug || loadingOwner) && !lab;

  const loadError = isUuid
    ? (errorById ? errById?.data?.message || errById?.message : null)
    : (errorBySlug && !labFromSlug ? errBySlug?.data?.message || errBySlug?.message : null);

  const handleApprove = async () => {
    if (!lab?.id) return;
    await setLabApproval({ id: lab.id, status: "approved" }).unwrap();
    toast.success("Lab approved");
    navigate("/app/course-approval");
  };

  const handleReject = async () => {
    if (!lab?.id) return;
    await setLabApproval({ id: lab.id, status: "rejected" }).unwrap();
    toast.success("Lab rejected");
    navigate("/app/course-approval");
  };

  return (
    <ContentApprovalReview
      kind="lab"
      slug={slug}
      title={title}
      approval={approval}
      loading={!!labSlug && isLoading}
      loadError={loadError}
      onApprove={handleApprove}
      onReject={handleReject}
      isMutating={isMutating}
      backPath="/app/course-approval"
      backLabel="Back to approval"
      headerIcon={Beaker}
    />
  );
}
