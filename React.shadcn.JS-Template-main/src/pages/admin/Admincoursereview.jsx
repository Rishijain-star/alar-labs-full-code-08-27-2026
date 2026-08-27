import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGetCourseBySlugQuery, useSetCourseContentApprovalMutation } from "@/store/api/courseApi";
import { toast } from "@/lib/toast";
import { BookOpen } from "lucide-react";
import ContentApprovalReview from "@/components/admin/ContentApprovalReview";

function parseCourseMetadata(raw) {
  if (raw == null || raw === "") return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const o = JSON.parse(raw);
      return typeof o === "object" && o !== null && !Array.isArray(o) ? o : {};
    } catch {
      return {};
    }
  }
  return {};
}

const AdminCourseReview = () => {
  const navigate = useNavigate();
  const { courseSlug } = useParams();

  const { data: courseRes, isLoading, isError, error } = useGetCourseBySlugQuery(courseSlug, {
    skip: !courseSlug,
  });
  const [setCourseApproval, { isLoading: isMutating }] = useSetCourseContentApprovalMutation();

  const raw = courseRes?.data?.course;
  const meta = useMemo(() => parseCourseMetadata(raw?.metadata), [raw]);
  const approval = meta.content_approval_status || "pending";
  const courseId = raw?.id;
  const title = raw?.title || courseSlug;

  const handleApprove = async () => {
    if (!courseId) return;
    await setCourseApproval({ id: courseId, status: "approved" }).unwrap();
    toast.success("Course approved");
    navigate("/app/course-approval");
  };

  const handleReject = async () => {
    if (!courseId) return;
    await setCourseApproval({ id: courseId, status: "rejected" }).unwrap();
    toast.success("Course rejected");
    navigate("/app/course-approval");
  };

  return (
    <ContentApprovalReview
      kind="course"
      slug={courseSlug}
      title={title}
      approval={approval}
      loading={!!courseSlug && isLoading && !raw}
      loadError={isError ? (error?.data?.message || error?.message || "Could not load course.") : null}
      onApprove={handleApprove}
      onReject={handleReject}
      isMutating={isMutating}
      backPath="/app/course-approval"
      backLabel="Back to Course Approval"
      headerIcon={BookOpen}
    />
  );
};

export default AdminCourseReview;
