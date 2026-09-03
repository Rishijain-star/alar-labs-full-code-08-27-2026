import { useState, useMemo, useEffect } from "react";
import { useGetCoursesQuery, useSetCourseContentApprovalMutation } from "@/store/api/courseApi";
import { useGetAdminCloudServicesQuery, useSetCloudServiceContentApprovalMutation } from "@/store/api/cloudServiceApi";
import { useGetAdminCareerOfferingsQuery, useSetCareerOfferingApprovalMutation } from "@/store/api/careerOfferingApi";
import { Briefcase } from "lucide-react";
import { useGetLabsQuery, useSetLabContentApprovalMutation } from "@/store/api/labApi";
import {
  useGetPendingExamTopicsSetsQuery,
  useSetExamTopicsContentApprovalMutation,
} from "@/store/api/examTopicsApi";
import { useNavigate } from "react-router-dom";
import { isStudent } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Check,
  X,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Beaker,
  GraduationCap,
  Loader2,
  FileText,
  Play,
  BookOpen,
  Cloud,
} from "lucide-react";
import { hasPermission } from "@/utils/permissions";
import { stripHtmlToPlain } from "@/lib/stripHtml";
import GlobalListManager from "../../components/common/Globallistmanager";
import GlobalPagination from "../../components/common/Pagination";
import { toast } from "@/lib/toast";
import ContentTypeBadge from "../../components/common/ContentTypeBadge";
import { confirmDelete } from "@/lib/confirmAction";

const LAB_DIFFICULTY_LABEL = {
  easy: "Beginner",
  medium: "Intermediate",
  hard: "Advanced",
};

export default function ContentApproval() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isStudent()) {
      toast.error("Students do not have permission to access Content Approval.");
      navigate("/app/dashboard", { replace: true });
    }
  }, [navigate]);

  const [activeTab, setActiveTab] = useState("courses");

  // Courses State
  const [coursesPage, setCoursesPage] = useState(1);
  const [coursesLimit] = useState(10);
  const [coursesSearch, setCoursesSearch] = useState("");
  const [coursesStatus, setCoursesStatus] = useState("all");
  const [coursesCategory, setCoursesCategory] = useState("all");
  const [coursesLevel, setCoursesLevel] = useState("all");

  // Labs State
  const [labsPage, setLabsPage] = useState(1);
  const [labsLimit] = useState(10);
  const [labsSearch, setLabsSearch] = useState("");
  const [labsStatus, setLabsStatus] = useState("all");
  const [labsPlatform, setLabsPlatform] = useState("all");
  const [labsLevel, setLabsLevel] = useState("all");

  // Career Offerings State
  const [careerOfferingsPage, setCareerOfferingsPage] = useState(1);
  const [careerOfferingsLimit] = useState(10);
  const [careerOfferingsSearch, setCareerOfferingsSearch] = useState("");
  const [careerOfferingsStatus, setCareerOfferingsStatus] = useState("all");

  // Cloud Services State
  const [cloudServicesPage, setCloudServicesPage] = useState(1);
  const [cloudServicesLimit] = useState(10);
  const [cloudServicesSearch, setCloudServicesSearch] = useState("");
  const [cloudServicesStatus, setCloudServicesStatus] = useState("all");

  // Exam Topics State
  const [examTopicsPage, setExamTopicsPage] = useState(1);
  const [examTopicsLimit] = useState(10);
  const [examTopicsSearch, setExamTopicsSearch] = useState("");
  const [examTopicsStatus, setExamTopicsStatus] = useState("all");
  const [examTopicsType, setExamTopicsType] = useState("all");

  // Dialog States
  const [selectedItem, setSelectedItem] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [fullReviewOpen, setFullReviewOpen] = useState(false);
  const [fullReviewItem, setFullReviewItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const openFullReview = (item, itemKind) => {
    const fullItem = { ...item, itemKind };
    setSelectedItem(fullItem);
    setFullReviewItem(fullItem);
    setFullReviewOpen(true);
  };

  const { data: pendingCQ, isLoading: coursesQueryLoading, isFetching: coursesQueryFetching, refetch: refetchPendingCourses } = useGetCoursesQuery(
    { approval: "pending", status: "published", limit: 100 },
    { refetchOnMountOrArgChange: true }
  );
  const [setCourseApproval] = useSetCourseContentApprovalMutation();

  const { data: pendingLQ, isLoading: labsQueryLoading, refetch: refetchPendingLabs } = useGetLabsQuery(
    { approval: "pending", status: "published", limit: 100 },
    { refetchOnMountOrArgChange: true }
  );
  const [setLabApproval] = useSetLabContentApprovalMutation();

  const { data: pendingCSQ, isLoading: cloudServicesQueryLoading, refetch: refetchPendingCloudServices } =
    useGetAdminCloudServicesQuery({ approval: "pending", limit: 100 }, { refetchOnMountOrArgChange: true });
  const [setCloudServiceApproval] = useSetCloudServiceContentApprovalMutation();

  const { data: pendingCOQ, isLoading: careerOfferingsQueryLoading, refetch: refetchPendingCareerOfferings } =
    useGetAdminCareerOfferingsQuery({ approval: "pending", limit: 100 }, { refetchOnMountOrArgChange: true });
  const [setCareerOfferingApproval] = useSetCareerOfferingApprovalMutation();

  const { data: pendingETQ, isLoading: examTopicsQueryLoading, refetch: refetchPendingExamTopics } =
    useGetPendingExamTopicsSetsQuery(undefined, { refetchOnMountOrArgChange: true });
  const [setExamTopicsApproval] = useSetExamTopicsContentApprovalMutation();

  const apiPendingCourses = useMemo(() => {
    const rows = pendingCQ?.data?.rows || pendingCQ?.rows || [];
    return rows.map((c) => {
      const approval = c.content_approval_status || "pending";
      const created = c.created_at || c.createdAt;
      return {
        ...c,
        id: c.id,
        slug: c.slug,
        title: c.title,
        author: c.author_name || "—",
        category: c.category_name || "—",
        level: c.level || "beginner",
        status: approval === "approved" ? "approved" : approval === "rejected" ? "rejected" : "pending",
        submitted_at: created ? String(created).slice(0, 10) : "",
        description: c.description || "",
        learning_objectives: [],
        prerequisites: "",
        duration: c.duration || "—",
        draft_data: c.draft_data || c.metadata?.draft_data || null,
      };
    });
  }, [pendingCQ]);

  const coursesSource = apiPendingCourses;

  const apiPendingLabs = useMemo(() => {
    const rows = pendingLQ?.data?.rows || pendingLQ?.rows || [];
    return rows.map((lab) => {
      const approval = lab.content_approval_status || "pending";
      const created = lab.created_at || lab.createdAt;
      const level = LAB_DIFFICULTY_LABEL[lab.difficulty] || lab.difficulty || "—";
      const kind = lab.lab_kind || lab.metadata?.lab_kind || null;
      return {
        ...lab,
        id: lab.id,
        slug: lab.slug,
        lab_kind: kind,
        title: lab.title,
        author: lab.author_name || "—",
        platform:
          kind === "skill_builder"
            ? "Skill Builder"
            : String(lab.type || "hands_on").replace(/_/g, " "),
        level,
        status: approval === "approved" ? "approved" : approval === "rejected" ? "rejected" : "pending",
        submitted_at: created ? String(created).slice(0, 10) : "",
        description: lab.description || "",
        duration: lab.time_limit_minutes != null ? `${lab.time_limit_minutes} min` : "—",
        is_free: lab.is_free,
        price: lab.price,
        draft_data: lab.draft_data || lab.metadata?.draft_data || null,
      };
    });
  }, [pendingLQ]);

  const labsSource = apiPendingLabs;

  const apiPendingExamTopics = useMemo(() => {
    const rows = pendingETQ?.data?.rows || pendingETQ?.rows || [];
    return rows.map((item) => {
      const approval = item.content_approval_status || "pending";
      return {
        ...item,
        id: item.setId,
        setId: item.setId,
        contentType: item.type,
        title: item.title || "Untitled",
        author: item.author_name || "—",
        questionCount: item.questionCount || (item.questions || []).length,
        timeLimitMinutes: item.timeLimitMinutes,
        status: approval === "approved" ? "approved" : approval === "rejected" ? "rejected" : "pending",
        submitted_at: item.updatedAt ? String(item.updatedAt).slice(0, 10) : "",
        description: item.description || "",
        draft_data: item.draft_data || null,
        questions: item.questions || [],
      };
    });
  }, [pendingETQ]);

  const examTopicsSource = apiPendingExamTopics;

  const apiPendingCloudServices = useMemo(() => {
    const rows = pendingCSQ?.data?.rows || pendingCSQ?.rows || pendingCSQ?.data || [];
    return Array.isArray(rows) ? rows.map((c) => {
      const approval = c.metadata?.content_approval_status || c.content_approval_status || "pending";
      const created = c.created_at || c.createdAt;
      return {
        ...c,
        id: c.id,
        title: c.title,
        author: c.author_name || "—",
        status: approval === "approved" ? "approved" : approval === "rejected" ? "rejected" : "pending",
        submitted_at: created ? String(created).slice(0, 10) : "",
        description: c.description || "",
        draft_data: c.draft_data || c.metadata?.draft_data || null,
      };
    }) : [];
  }, [pendingCSQ]);

  const cloudServicesSource = apiPendingCloudServices;

  const apiPendingCareerOfferings = useMemo(() => {
    const rows = pendingCOQ?.data?.rows || pendingCOQ?.rows || pendingCOQ?.data || [];
    return Array.isArray(rows) ? rows.map((c) => {
      const approval = c.metadata?.content_approval_status || c.content_approval_status || "pending";
      const created = c.created_at || c.createdAt;
      return {
        ...c,
        id: c.id,
        title: c.title,
        author: c.author_name || "—",
        status: approval === "approved" ? "approved" : approval === "rejected" ? "rejected" : "pending",
        submitted_at: created ? String(created).slice(0, 10) : "",
        description: c.description || "",
        draft_data: c.draft_data || c.metadata?.draft_data || null,
      };
    }) : [];
  }, [pendingCOQ]);

  const careerOfferingsSource = apiPendingCareerOfferings;

  // Filter and paginate courses
  const filteredCourses = coursesSource.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(coursesSearch.toLowerCase()) ||
      String(course.author || "").toLowerCase().includes(coursesSearch.toLowerCase());
    const matchesStatus = coursesStatus === "all" || course.status === coursesStatus;
    const matchesCategory =
      coursesCategory === "all" ||
      String(course.category || "").toLowerCase() === coursesCategory;
    const matchesLevel =
      coursesLevel === "all" ||
      String(course.level || "").toLowerCase() === coursesLevel;

    return matchesSearch && matchesStatus && matchesCategory && matchesLevel;
  });

  const totalCourses = filteredCourses.length;
  const totalCoursesPages = Math.ceil(totalCourses / coursesLimit);
  const coursesStartIndex = (coursesPage - 1) * coursesLimit;
  const coursesEndIndex = coursesStartIndex + coursesLimit;
  const paginatedCourses = filteredCourses.slice(coursesStartIndex, coursesEndIndex);

  // Filter and paginate labs
  const filteredLabs = labsSource.filter((lab) => {
    const matchesSearch =
      lab.title.toLowerCase().includes(labsSearch.toLowerCase()) ||
      String(lab.author || "").toLowerCase().includes(labsSearch.toLowerCase());
    const matchesStatus = labsStatus === "all" || lab.status === labsStatus;
    const matchesPlatform =
      labsPlatform === "all" ||
      lab.platform.toLowerCase().includes(labsPlatform.toLowerCase());
    const matchesLevel =
      labsLevel === "all" || String(lab.level || "").toLowerCase() === labsLevel;

    return matchesSearch && matchesStatus && matchesPlatform && matchesLevel;
  });

  const totalLabs = filteredLabs.length;
  const totalLabsPages = Math.ceil(totalLabs / labsLimit);
  const labsStartIndex = (labsPage - 1) * labsLimit;
  const labsEndIndex = labsStartIndex + labsLimit;
  const paginatedLabs = filteredLabs.slice(labsStartIndex, labsEndIndex);

  const filteredExamTopics = examTopicsSource.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(examTopicsSearch.toLowerCase()) ||
      String(item.author || "").toLowerCase().includes(examTopicsSearch.toLowerCase());
    const matchesStatus = examTopicsStatus === "all" || item.status === examTopicsStatus;
    const matchesType = examTopicsType === "all" || item.contentType === examTopicsType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalExamTopics = filteredExamTopics.length;
  const totalExamTopicsPages = Math.ceil(totalExamTopics / examTopicsLimit);
  const examTopicsStartIndex = (examTopicsPage - 1) * examTopicsLimit;
  const examTopicsEndIndex = examTopicsStartIndex + examTopicsLimit;
  const paginatedExamTopics = filteredExamTopics.slice(examTopicsStartIndex, examTopicsEndIndex);

  const pendingCoursesCount = coursesSource.filter((c) => c.status === "pending").length;
  const pendingLabsCount = labsSource.filter((l) => l.status === "pending").length;
  const pendingExamTopicsCount = examTopicsSource.filter((e) => e.status === "pending").length;

  const filteredCloudServices = cloudServicesSource.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(cloudServicesSearch.toLowerCase());
    const matchesStatus = cloudServicesStatus === "all" || item.status === cloudServicesStatus;
    return matchesSearch && matchesStatus;
  });

  const totalCloudServices = filteredCloudServices.length;
  const totalCloudServicesPages = Math.ceil(totalCloudServices / cloudServicesLimit);
  const cloudServicesStartIndex = (cloudServicesPage - 1) * cloudServicesLimit;
  const cloudServicesEndIndex = cloudServicesStartIndex + cloudServicesLimit;
  const paginatedCloudServices = filteredCloudServices.slice(cloudServicesStartIndex, cloudServicesEndIndex);

  const pendingCloudServicesCount = cloudServicesSource.filter((c) => c.status === "pending").length;

  const filteredCareerOfferings = careerOfferingsSource.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(careerOfferingsSearch.toLowerCase());
    const matchesStatus = careerOfferingsStatus === "all" || item.status === careerOfferingsStatus;
    return matchesSearch && matchesStatus;
  });

  const totalCareerOfferings = filteredCareerOfferings.length;
  const totalCareerOfferingsPages = Math.ceil(totalCareerOfferings / careerOfferingsLimit);
  const careerOfferingsStartIndex = (careerOfferingsPage - 1) * careerOfferingsLimit;
  const careerOfferingsEndIndex = careerOfferingsStartIndex + careerOfferingsLimit;
  const paginatedCareerOfferings = filteredCareerOfferings.slice(careerOfferingsStartIndex, careerOfferingsEndIndex);

  const pendingCareerOfferingsCount = careerOfferingsSource.filter((c) => c.status === "pending").length;

  const canApproveCourses =
    hasPermission("approve_courses") || hasPermission("approve_own_courses");
  const canApproveLabs =
    hasPermission("approve_labs") ||
    hasPermission("approve_courses") ||
    hasPermission("approve_own_labs");
  const canApproveCloudServices = hasPermission("approve_cloud_services") || hasPermission("approve_courses");
  const canApproveCareerOfferings = hasPermission("approve_career_offerings") || hasPermission("approve_courses");
  const canApproveExamTopics =
    hasPermission("approve_exam_topics") ||
    hasPermission("approve_courses") ||
    hasPermission("approve_labs") ||
    hasPermission("approve_own_exam_topics");
  const canEditCourse = hasPermission("edit_courses");
  const canEditLab = hasPermission("edit_labs");
  const canDeleteCourse = hasPermission("delete_courses");
  const canDeleteLab = hasPermission("delete_labs");
  const coursesListOwnOnly =
    !hasPermission("approve_courses") && hasPermission("approve_own_courses");
  const labsListOwnOnly =
    !hasPermission("approve_courses") &&
    !hasPermission("approve_labs") &&
    hasPermission("approve_own_labs");
  const examTopicsListOwnOnly =
    !hasPermission("approve_exam_topics") &&
    !hasPermission("approve_courses") &&
    !hasPermission("approve_labs") &&
    hasPermission("approve_own_exam_topics");

  // Handlers
  const handleQuickApprove = async (itemId, type) => {
    if (type === "career_offering") {
      try {
        await setCareerOfferingApproval({ id: itemId, status: "approved" }).unwrap();
        toast.success("Career offering approved");
        refetchPendingCareerOfferings();
      } catch (e) {
        toast.error(e?.data?.message || e?.message || "Approval failed");
      }
      return;
    }
    if (type === "cloud_service") {
      try {
        await setCloudServiceApproval({ id: itemId, status: "approved" }).unwrap();
        toast.success("Cloud service approved");
        refetchPendingCloudServices();
      } catch (e) {
        toast.error(e?.data?.message || e?.message || "Approval failed");
      }
      return;
    }
    if (type === "course") {
      try {
        await setCourseApproval({ id: itemId, status: "approved" }).unwrap();
        toast.success("Course approved");
        refetchPendingCourses();
      } catch (e) {
        toast.error(e?.data?.message || e?.message || "Approval failed");
      }
      return;
    }
    if (type === "lab") {
      try {
        await setLabApproval({ id: itemId, status: "approved" }).unwrap();
        toast.success("Lab approved");
        refetchPendingLabs();
      } catch (e) {
        toast.error(e?.data?.message || e?.message || "Approval failed");
      }
      return;
    }
    if (type === "exam_topic") {
      try {
        await setExamTopicsApproval({
          type: itemId.contentType,
          setId: itemId.setId,
          status: "approved",
        }).unwrap();
        toast.success("Exam topic approved");
        refetchPendingExamTopics();
      } catch (e) {
        toast.error(e?.data?.message || e?.message || "Approval failed");
      }
      return;
    }
  };

  const handleQuickReject = async () => {
    if (!selectedItem) return;
    const reason = rejectionReason || "No reason provided";
    if (selectedItem.itemKind === "career_offering") {
      try {
        await setCareerOfferingApproval({ id: selectedItem.id, status: "rejected", rejection_reason: reason }).unwrap();
        toast.success("Career offering rejected");
        refetchPendingCareerOfferings();
      } catch (e) {
        toast.error(e?.data?.message || e?.message || "Reject failed");
      }
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedItem(null);
      return;
    }
    if (selectedItem.itemKind === "cloud_service") {
      try {
        await setCloudServiceApproval({ id: selectedItem.id, status: "rejected", rejection_reason: reason }).unwrap();
        toast.success("Cloud service rejected");
        refetchPendingCloudServices();
      } catch (e) {
        toast.error(e?.data?.message || e?.message || "Reject failed");
      }
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedItem(null);
      return;
    }
    if (selectedItem.itemKind === "course") {
      try {
        await setCourseApproval({ id: selectedItem.id, status: "rejected", rejection_reason: reason }).unwrap();
        toast.success("Course rejected");
        refetchPendingCourses();
      } catch (e) {
        toast.error(e?.data?.message || e?.message || "Reject failed");
      }
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedItem(null);
      return;
    }
    if (selectedItem.itemKind === "lab") {
      try {
        await setLabApproval({ id: selectedItem.id, status: "rejected", rejection_reason: reason }).unwrap();
        toast.success("Lab rejected");
        refetchPendingLabs();
      } catch (e) {
        toast.error(e?.data?.message || e?.message || "Reject failed");
      }
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedItem(null);
      return;
    }
    if (selectedItem.itemKind === "exam_topic") {
      try {
        await setExamTopicsApproval({
          type: selectedItem.contentType,
          setId: selectedItem.setId,
          status: "rejected",
          rejection_reason: reason,
        }).unwrap();
        toast.success("Exam topic rejected");
        refetchPendingExamTopics();
      } catch (e) {
        toast.error(e?.data?.message || e?.message || "Reject failed");
      }
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedItem(null);
      return;
    }
  };

  const handleDelete = async (itemId, type) => {
    if (!(await confirmDelete(`this ${type}`))) return;
    toast.success(`${type === "course" ? "Course" : "Lab"} deleted successfully`);
  };

  const handlePreview = (item, itemKind) => {
    setSelectedItem({ ...item, itemKind });
    setPreviewDialogOpen(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-amber-500" />;
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const firstLabSlugToRun =
    activeTab === "labs"
      ? filteredLabs.find((l) => l.slug)?.slug || labsSource.find((l) => l.slug)?.slug
      : labsSource.find((l) => l.slug)?.slug;

  return (
    <>
      {(coursesListOwnOnly || labsListOwnOnly || examTopicsListOwnOnly) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-800">
          {coursesListOwnOnly && labsListOwnOnly && examTopicsListOwnOnly && (
            <span>
              You are viewing <strong>your own</strong> pending courses, labs, and exam topics. Users
              with full approval permissions see all authors.
            </span>
          )}
          {coursesListOwnOnly && !labsListOwnOnly && !examTopicsListOwnOnly && (
            <span>
              Pending <strong>courses</strong> are limited to those you created. Lab visibility follows
              your lab-approval permissions.
            </span>
          )}
          {!coursesListOwnOnly && labsListOwnOnly && !examTopicsListOwnOnly && (
            <span>
              Pending <strong>labs</strong> are limited to those you created.
            </span>
          )}
          {!coursesListOwnOnly && !labsListOwnOnly && examTopicsListOwnOnly && (
            <span>
              Pending <strong>exam topics</strong> are limited to those you created.
            </span>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-4xl grid-cols-5">
          <TabsTrigger value="courses" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            Courses
            {pendingCoursesCount > 0 && (
              <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700">
                {pendingCoursesCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="labs" className="gap-2">
            <Beaker className="w-4 h-4" />
            Labs
            {pendingLabsCount > 0 && (
              <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700">
                {pendingLabsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="exam-topics" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Exam Topics
            {pendingExamTopicsCount > 0 && (
              <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700">
                {pendingExamTopicsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="career-offerings" className="gap-2">
            <Briefcase className="w-4 h-4" />
            Career Offerings
            {pendingCareerOfferingsCount > 0 && (
              <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700">
                {pendingCareerOfferingsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="cloud-services" className="gap-2">
            <Cloud className="w-4 h-4" />
            Cloud Services
            {pendingCloudServicesCount > 0 && (
              <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700">
                {pendingCloudServicesCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Courses Tab */}
        <TabsContent value="courses">
          <GlobalListManager
            title="Course Approval"
            description="Review and approve submitted courses"
            showAddButton={false}
            showExportButton={false}
            showRefreshButton={false}
            searchConfig={{
              value: coursesSearch,
              onChange: setCoursesSearch,
              onPageReset: () => setCoursesPage(1),
              placeholder: "Search courses or authors...",
            }}
            filters={[
              {
                value: coursesStatus,
                onChange: setCoursesStatus,
                onPageReset: () => setCoursesPage(1),
                placeholder: "Status",
                width: "w-40",
                options: [
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                ],
                allOptionText: "All Status",
              },
              {
                value: coursesCategory,
                onChange: setCoursesCategory,
                onPageReset: () => setCoursesPage(1),
                placeholder: "Category",
                width: "w-48",
                options: [
                  { value: "data science", label: "Data Science" },
                  { value: "web development", label: "Web Development" },
                  { value: "cloud computing", label: "Cloud Computing" },
                  { value: "devops", label: "DevOps" },
                ],
                allOptionText: "All Categories",
              },
              {
                value: coursesLevel,
                onChange: setCoursesLevel,
                onPageReset: () => setCoursesPage(1),
                placeholder: "Level",
                width: "w-40",
                options: [
                  { value: "beginner", label: "Beginner" },
                  { value: "intermediate", label: "Intermediate" },
                  { value: "advanced", label: "Advanced" },
                ],
                allOptionText: "All Levels",
              },
            ]}
            customActions={
              pendingCoursesCount > 0 && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <Clock className="w-3 h-3 mr-1" />
                  {pendingCoursesCount} Pending
                </Badge>
              )
            }
          >
            {coursesQueryLoading && coursesSource.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Loading pending courses…</p>
              </div>
            ) : (
              <>
                {/* Results Info */}
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing{" "}
                    <span className="font-semibold text-foreground">{paginatedCourses.length}</span> of{" "}
                    <span className="font-semibold text-foreground">{totalCourses}</span> courses
                  </p>
                </div>

                {/* Table */}
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Type</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCourses.map((course) => (
                        <TableRow key={course.id} className="hover:bg-muted/30">
                          <TableCell>
                            <ContentTypeBadge kind="course" />
                          </TableCell>
                          <TableCell className="font-medium max-w-xs">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="truncate">{course.title}</span>
                            </div>
                          </TableCell>
                          <TableCell>{course.author}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{course.category}</Badge>
                          </TableCell>
                          <TableCell className="capitalize">{course.level}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(course.status)}
                              {getStatusBadge(course.status)}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {course.submitted_at
                              ? new Date(course.submitted_at).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {course.status !== "pending" && (
                                  <DropdownMenuItem onClick={() => handlePreview(course, "course")}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Preview Content
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => openFullReview(course, "course")}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Full Review
                                </DropdownMenuItem>
                                {canApproveCourses && course.status === "pending" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-green-600"
                                      onClick={() => handleQuickApprove(course.id, "course")}
                                    >
                                      <Check className="mr-2 h-4 w-4" />
                                      Quick Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => {
                                        setSelectedItem({ ...course, itemKind: "course" });
                                        setRejectDialogOpen(true);
                                      }}
                                    >
                                      <X className="mr-2 h-4 w-4" />
                                      Quick Reject
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                {canEditCourse && (
                                  <DropdownMenuItem
                                    onClick={() => navigate(`/admin/courses/${course.id}/edit`)}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {canDeleteCourse && (
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => handleDelete(course.id, "course")}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Empty State */}
                {paginatedCourses.length === 0 && (
                  <div className="text-center py-12">
                    <GraduationCap className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No courses found</h3>
                    <p className="text-muted-foreground">Try adjusting your filters or search query</p>
                  </div>
                )}

                {/* Pagination */}
                {totalCoursesPages > 1 && (
                  <div className="mt-6">
                    <GlobalPagination
                      page={coursesPage}
                      totalPages={totalCoursesPages}
                      totalItems={totalCourses}
                      itemsPerPage={coursesLimit}
                      onPageChange={(page) => {
                        setCoursesPage(page);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      showInfo={true}
                    />
                  </div>
                )}
              </>
            )}
          </GlobalListManager>
        </TabsContent>

        {/* Labs Tab */}
        <TabsContent value="labs">
          <GlobalListManager
            title="Lab Approval"
            description="Review and approve submitted labs (hands-on and skill builder)"
            showAddButton={false}
            showExportButton={false}
            showRefreshButton={false}
            searchConfig={{
              value: labsSearch,
              onChange: setLabsSearch,
              onPageReset: () => setLabsPage(1),
              placeholder: "Search labs or authors...",
            }}
            filters={[
              {
                value: labsStatus,
                onChange: setLabsStatus,
                onPageReset: () => setLabsPage(1),
                placeholder: "Status",
                width: "w-40",
                options: [
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                ],
                allOptionText: "All Status",
              },
              {
                value: labsPlatform,
                onChange: setLabsPlatform,
                onPageReset: () => setLabsPage(1),
                placeholder: "Type",
                width: "w-40",
                options: [
                  { value: "skill", label: "Skill Builder" },
                  { value: "hands", label: "Hands-on" },
                  { value: "quiz", label: "Quiz" },
                  { value: "assessment", label: "Assessment" },
                  { value: "project", label: "Project" },
                ],
                allOptionText: "All Types",
              },
              {
                value: labsLevel,
                onChange: setLabsLevel,
                onPageReset: () => setLabsPage(1),
                placeholder: "Level",
                width: "w-40",
                options: [
                  { value: "beginner", label: "Beginner" },
                  { value: "intermediate", label: "Intermediate" },
                  { value: "advanced", label: "Advanced" },
                ],
                allOptionText: "All Levels",
              },
            ]}
            customActions={
              pendingLabsCount > 0 && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <Clock className="w-3 h-3 mr-1" />
                  {pendingLabsCount} Pending
                </Badge>
              )
            }
          >
            {labsQueryLoading && labsSource.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Loading pending labs…</p>
              </div>
            ) : (
              <>
                {/* Results Info */}
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing{" "}
                    <span className="font-semibold text-foreground">{paginatedLabs.length}</span> of{" "}
                    <span className="font-semibold text-foreground">{totalLabs}</span> labs
                  </p>
                </div>

                {/* Table */}
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Kind</TableHead>
                        <TableHead>Lab Title</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Format</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLabs.map((lab) => (
                        <TableRow key={lab.id} className="hover:bg-muted/30">
                          <TableCell>
                            <ContentTypeBadge
                              kind={lab.lab_kind === "skill_builder" ? "skill_builder" : "lab"}
                            />
                          </TableCell>
                          <TableCell className="font-medium max-w-xs">
                            <div className="flex items-center gap-2">
                              <Beaker className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="truncate">{lab.title}</span>
                            </div>
                          </TableCell>
                          <TableCell>{lab.author}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {lab.platform}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">{lab.level}</TableCell>
                          <TableCell className="text-muted-foreground">{lab.duration}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(lab.status)}
                              {getStatusBadge(lab.status)}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {lab.submitted_at
                              ? new Date(lab.submitted_at).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {lab.status !== "pending" && (
                                  <DropdownMenuItem onClick={() => handlePreview(lab, "lab")}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Preview Content
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => openFullReview(lab, "lab")}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Full Review
                                </DropdownMenuItem>
                                {canApproveLabs && lab.status === "pending" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-green-600"
                                      onClick={() => handleQuickApprove(lab.id, "lab")}
                                    >
                                      <Check className="mr-2 h-4 w-4" />
                                      Quick Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => {
                                        setSelectedItem({ ...lab, itemKind: "lab" });
                                        setRejectDialogOpen(true);
                                      }}
                                    >
                                      <X className="mr-2 h-4 w-4" />
                                      Quick Reject
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                {canEditLab && (
                                  <DropdownMenuItem onClick={() => navigate("/app/labs")}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {canDeleteLab && (
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => handleDelete(lab.id, "lab")}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Empty State */}
                {paginatedLabs.length === 0 && (
                  <div className="text-center py-12">
                    <Beaker className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No labs found</h3>
                    <p className="text-muted-foreground">Try adjusting your filters or search query</p>
                  </div>
                )}

                {/* Pagination */}
                {totalLabsPages > 1 && (
                  <div className="mt-6">
                    <GlobalPagination
                      page={labsPage}
                      totalPages={totalLabsPages}
                      totalItems={totalLabs}
                      itemsPerPage={labsLimit}
                      onPageChange={(page) => {
                        setLabsPage(page);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      showInfo={true}
                    />
                  </div>
                )}
              </>
            )}
          </GlobalListManager>
        </TabsContent>

        <TabsContent value="exam-topics">
          <GlobalListManager
            title="Exam Topics Approval"
            description="Review and approve submitted learning sets and exams"
            showAddButton={false}
            showExportButton={false}
            showRefreshButton={false}
            searchConfig={{
              value: examTopicsSearch,
              onChange: setExamTopicsSearch,
              onPageReset: () => setExamTopicsPage(1),
              placeholder: "Search exam topics…",
            }}
            filters={[
              {
                value: examTopicsStatus,
                onChange: setExamTopicsStatus,
                onPageReset: () => setExamTopicsPage(1),
                placeholder: "Status",
                width: "w-40",
                options: [
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                ],
                allOptionText: "All Status",
              },
              {
                value: examTopicsType,
                onChange: setExamTopicsType,
                onPageReset: () => setExamTopicsPage(1),
                placeholder: "Type",
                width: "w-40",
                options: [
                  { value: "learning", label: "Learning" },
                  { value: "exam", label: "Exam" },
                ],
                allOptionText: "All Types",
              },
            ]}
            customActions={
              pendingExamTopicsCount > 0 && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <Clock className="w-3 h-3 mr-1" />
                  {pendingExamTopicsCount} Pending
                </Badge>
              )
            }
          >
            {examTopicsQueryLoading && examTopicsSource.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Loading pending exam topics…</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing{" "}
                    <span className="font-semibold text-foreground">{paginatedExamTopics.length}</span> of{" "}
                    <span className="font-semibold text-foreground">{totalExamTopics}</span> exam topic sets
                  </p>
                </div>

                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Questions</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedExamTopics.map((item) => (
                        <TableRow key={`${item.contentType}-${item.setId}`} className="hover:bg-muted/30">
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {item.contentType === "exam" ? "Exam" : "Learning"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium max-w-xs">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="truncate">{item.title}</span>
                            </div>
                          </TableCell>
                          <TableCell>{item.questionCount}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.contentType === "exam"
                              ? `${item.timeLimitMinutes || 50} min`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(item.status)}
                              {getStatusBadge(item.status)}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.submitted_at
                              ? new Date(item.submitted_at).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {item.status !== "pending" && (
                                  <DropdownMenuItem
                                    onClick={() => handlePreview(item, "exam_topic")}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Preview Content
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => openFullReview(item, "exam_topic")}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Full Review
                                </DropdownMenuItem>
                                {canApproveExamTopics && item.status === "pending" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-green-600"
                                      onClick={() => handleQuickApprove(item, "exam_topic")}
                                    >
                                      <Check className="mr-2 h-4 w-4" />
                                      Quick Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => {
                                        setSelectedItem({ ...item, itemKind: "exam_topic" });
                                        setRejectDialogOpen(true);
                                      }}
                                    >
                                      <X className="mr-2 h-4 w-4" />
                                      Quick Reject
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {paginatedExamTopics.length === 0 && (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No exam topics found</h3>
                    <p className="text-muted-foreground">Try adjusting your filters or search query</p>
                  </div>
                )}

                {totalExamTopicsPages > 1 && (
                  <div className="mt-6">
                    <GlobalPagination
                      page={examTopicsPage}
                      totalPages={totalExamTopicsPages}
                      totalItems={totalExamTopics}
                      itemsPerPage={examTopicsLimit}
                      onPageChange={(page) => {
                        setExamTopicsPage(page);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      showInfo={true}
                    />
                  </div>
                )}
              </>
            )}
          </GlobalListManager>
        </TabsContent>

        <TabsContent value="cloud-services">
          <GlobalListManager
            title="Cloud Services Approval"
            description="Review and approve submitted cloud services"
            showAddButton={false}
            showExportButton={false}
            showRefreshButton={false}
            searchConfig={{
              value: cloudServicesSearch,
              onChange: setCloudServicesSearch,
              onPageReset: () => setCloudServicesPage(1),
              placeholder: "Search cloud services...",
            }}
            filters={[
              {
                value: cloudServicesStatus,
                onChange: setCloudServicesStatus,
                onPageReset: () => setCloudServicesPage(1),
                placeholder: "Status",
                width: "w-40",
                options: [
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                ],
                allOptionText: "All Status",
              },
            ]}
          >
            {cloudServicesQueryLoading && cloudServicesSource.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Loading pending cloud services…</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{paginatedCloudServices.length}</span> of <span className="font-semibold text-foreground">{totalCloudServices}</span> cloud services
                  </p>
                </div>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Type</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCloudServices.map((service) => (
                        <TableRow key={service.id} className="hover:bg-muted/30">
                          <TableCell><ContentTypeBadge kind="cloud_service" /></TableCell>
                          <TableCell className="font-medium max-w-xs">
                            <div className="flex items-center gap-2">
                              <Cloud className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="truncate">{service.title}</span>
                            </div>
                          </TableCell>
                          <TableCell>{service.author}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(service.status)}
                              {getStatusBadge(service.status)}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {service.submitted_at ? new Date(service.submitted_at).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {service.status !== "pending" && (
                                  <DropdownMenuItem onClick={() => handlePreview(service, "cloud_service")}>
                                    <Eye className="mr-2 h-4 w-4" /> Preview Content
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => openFullReview(service, "cloud_service")}>
                                  <FileText className="mr-2 h-4 w-4" /> Full Review
                                </DropdownMenuItem>
                                {canApproveCloudServices && service.status === "pending" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-green-600" onClick={() => handleQuickApprove(service.id, "cloud_service")}>
                                      <Check className="mr-2 h-4 w-4" /> Quick Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedItem({ ...service, itemKind: "cloud_service" }); setRejectDialogOpen(true); }}>
                                      <X className="mr-2 h-4 w-4" /> Quick Reject
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {paginatedCloudServices.length === 0 && (
                  <div className="text-center py-12">
                    <Cloud className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No cloud services found</h3>
                    <p className="text-muted-foreground">Try adjusting your filters or search query</p>
                  </div>
                )}
                {totalCloudServicesPages > 1 && (
                  <div className="mt-6">
                    <GlobalPagination
                      page={cloudServicesPage}
                      totalPages={totalCloudServicesPages}
                      totalItems={totalCloudServices}
                      itemsPerPage={cloudServicesLimit}
                      onPageChange={(page) => {
                        setCloudServicesPage(page);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      showInfo={true}
                    />
                  </div>
                )}
              </>
            )}
          </GlobalListManager>
        </TabsContent>

        <TabsContent value="career-offerings">
          <GlobalListManager
            title="Career Offerings Approval"
            description="Review and approve submitted tech career pathways"
            showAddButton={false}
            showExportButton={false}
            showRefreshButton={false}
            searchConfig={{
              value: careerOfferingsSearch,
              onChange: setCareerOfferingsSearch,
              onPageReset: () => setCareerOfferingsPage(1),
              placeholder: "Search career offerings...",
            }}
            filters={[
              {
                value: careerOfferingsStatus,
                onChange: setCareerOfferingsStatus,
                onPageReset: () => setCareerOfferingsPage(1),
                placeholder: "Status",
                width: "w-40",
                options: [
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                ],
                allOptionText: "All Status",
              },
            ]}
          >
            {careerOfferingsQueryLoading && careerOfferingsSource.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Loading pending career offerings…</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{paginatedCareerOfferings.length}</span> of <span className="font-semibold text-foreground">{totalCareerOfferings}</span> career offerings
                  </p>
                </div>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Type</TableHead>
                        <TableHead>Offering</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCareerOfferings.map((service) => (
                        <TableRow key={service.id} className="hover:bg-muted/30">
                          <TableCell><Badge variant="secondary">Career Pathway</Badge></TableCell>
                          <TableCell className="font-medium max-w-xs">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="truncate">{service.title}</span>
                            </div>
                          </TableCell>
                          <TableCell>{service.author}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(service.status)}
                              {getStatusBadge(service.status)}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {service.submitted_at ? new Date(service.submitted_at).toLocaleDateString() : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {service.status !== "pending" && (
                                  <DropdownMenuItem onClick={() => handlePreview(service, "career_offering")}>
                                    <Eye className="mr-2 h-4 w-4" /> Preview Content
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => openFullReview(service, "career_offering")}>
                                  <FileText className="mr-2 h-4 w-4" /> Full Review
                                </DropdownMenuItem>
                                {canApproveCareerOfferings && service.status === "pending" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-green-600" onClick={() => handleQuickApprove(service.id, "career_offering")}>
                                      <Check className="mr-2 h-4 w-4" /> Quick Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedItem({ ...service, itemKind: "career_offering" }); setRejectDialogOpen(true); }}>
                                      <X className="mr-2 h-4 w-4" /> Quick Reject
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {paginatedCareerOfferings.length === 0 && (
                  <div className="text-center py-12">
                    <Briefcase className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No career offerings found</h3>
                    <p className="text-muted-foreground">Try adjusting your filters or search query</p>
                  </div>
                )}
                {totalCareerOfferingsPages > 1 && (
                  <div className="mt-6">
                    <GlobalPagination
                      page={careerOfferingsPage}
                      totalPages={totalCareerOfferingsPages}
                      totalItems={totalCareerOfferings}
                      itemsPerPage={careerOfferingsLimit}
                      onPageChange={(page) => {
                        setCareerOfferingsPage(page);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      showInfo={true}
                    />
                  </div>
                )}
              </>
            )}
          </GlobalListManager>
        </TabsContent>
      </Tabs>

      {/* Quick Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Quick Reject{" "}
              {selectedItem?.itemKind === "exam_topic"
                ? "Exam Topic"
                : selectedItem?.itemKind === "course"
                  ? "Course"
                  : selectedItem?.itemKind === "cloud_service"
                  ? "Cloud Service"
                  : selectedItem?.itemKind === "career_offering"
                  ? "Career Offering"
                  : selectedItem?.itemKind === "career_offering"
                  ? "Career Offering"
                  : "Lab"}
            </DialogTitle>
            <DialogDescription>
              Provide a brief reason for rejection. For detailed review, use the "Full Review" option.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="block text-sm font-medium mb-2">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="e.g., Content quality needs improvement, missing prerequisites..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
                setSelectedItem(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleQuickReject}
              disabled={!rejectionReason.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                `Reject ${
                  selectedItem?.itemKind === "exam_topic"
                    ? "Exam Topic"
                    : selectedItem?.itemKind === "course"
                      ? "Course"
                      : "Lab"
                }`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {selectedItem?.itemKind === "exam_topic" ? (
                <BookOpen className="h-5 w-5" />
              ) : selectedItem?.itemKind === "cloud_service" ? (
                <Cloud className="h-5 w-5" />
              ) : selectedItem?.itemKind === "career_offering" ? (
                <Briefcase className="h-5 w-5" />
              ) : selectedItem?.itemKind === "course" ? (
                <GraduationCap className="h-5 w-5" />
              ) : (
                <Beaker className="h-5 w-5" />
              )}
              {selectedItem?.itemKind === "exam_topic" ? (
                <Badge variant="secondary" className="capitalize">
                  {selectedItem?.contentType === "exam" ? "Exam" : "Learning set"}
                </Badge>
              ) : selectedItem?.itemKind === "course" ? (
                <ContentTypeBadge kind="course" />
              ) : (
                <ContentTypeBadge
                  kind={selectedItem?.lab_kind === "skill_builder" ? "skill_builder" : "lab"}
                />
              )}
              <span className="font-semibold">{selectedItem?.title}</span>
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.itemKind === "exam_topic"
                ? "Exam topic"
                : selectedItem?.itemKind === "course"
                  ? "Course"
                  : selectedItem?.itemKind === "cloud_service"
                  ? "Cloud Service"
                  : "Lab"}{" "}
              Content Preview
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-6">
              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Author</p>
                  <p className="text-sm">{selectedItem.author}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedItem.status)}</div>
                </div>
                {selectedItem.itemKind === "exam_topic" ? (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Type</p>
                      <Badge variant="secondary" className="capitalize">
                        {selectedItem.contentType === "exam" ? "Exam" : "Learning set"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Questions</p>
                      <p className="text-sm">{selectedItem.questionCount}</p>
                    </div>
                    {selectedItem.contentType === "exam" && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Duration</p>
                        <p className="text-sm">{selectedItem.timeLimitMinutes || 50} min</p>
                      </div>
                    )}
                  </>
                ) : selectedItem.itemKind === "course" ? (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Category</p>
                      <Badge variant="secondary">{selectedItem.category}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Duration</p>
                      <p className="text-sm">{selectedItem.duration}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Platform</p>
                      <Badge variant="secondary">{selectedItem.platform}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Duration</p>
                      <p className="text-sm">{selectedItem.duration}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Price</p>
                      <p className="text-sm">
                        {selectedItem.is_free ? (
                          <Badge variant="secondary">Free</Badge>
                        ) : selectedItem.price != null ? (
                          `$${selectedItem.price}`
                        ) : (
                          "Free"
                        )}
                      </p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Level</p>
                  <p className="text-sm capitalize">{selectedItem.level || "Standard"}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm whitespace-pre-wrap">
                      {stripHtmlToPlain(selectedItem.description) || "—"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Learning Objectives */}
              {selectedItem.learning_objectives && selectedItem.learning_objectives.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Learning Objectives
                  </p>
                  <Card>
                    <CardContent className="pt-4">
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {selectedItem.learning_objectives.map((obj, idx) => (
                          <li key={idx}>{obj}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Prerequisites */}
              {selectedItem.prerequisites && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Prerequisites</p>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm">{selectedItem.prerequisites}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Lab Steps */}
              {selectedItem.itemKind === "lab" && selectedItem.steps && selectedItem.steps.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Lab Steps ({selectedItem.steps.length} total)
                  </p>
                  <Card>
                    <CardContent className="pt-4">
                      <ol className="space-y-2 text-sm">
                        {selectedItem.steps.slice(0, 3).map((step, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span className="font-medium">
                              {idx + 1}. {step.title}
                            </span>
                            <span className="text-muted-foreground">{step.duration}</span>
                          </li>
                        ))}
                        {selectedItem.steps.length > 3 && (
                          <li className="text-muted-foreground italic">
                            ... and {selectedItem.steps.length - 3} more steps
                          </li>
                        )}
                      </ol>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedItem.status === "rejected" && selectedItem.rejection_reason && (
                <div>
                  <p className="text-sm font-medium text-red-600 mb-2">Rejection Reason</p>
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-4">
                      <p className="text-sm text-red-900">{selectedItem.rejection_reason}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
            <Button
              className="bg-primary text-primary-foreground font-medium"
              onClick={() => {
                setPreviewDialogOpen(false);
                openFullReview(selectedItem, selectedItem?.itemKind);
              }}
            >
              Full Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FULL CONTENT REVIEW DIALOG WITH DIFF HIGHLIGHTING */}
      <Dialog open={fullReviewOpen} onOpenChange={setFullReviewOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <ContentTypeBadge kind={fullReviewItem?.itemKind} />
                  <span>{fullReviewItem?.title || "Untitled"}</span>
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Submitted by <span className="font-semibold text-foreground">{fullReviewItem?.author}</span> on {fullReviewItem?.submitted_at ? new Date(fullReviewItem.submitted_at).toLocaleDateString() : "recent"}
                </DialogDescription>
              </div>
              {getStatusBadge(fullReviewItem?.status)}
            </div>
          </DialogHeader>

          {fullReviewItem && (
            <div className="space-y-6 py-2">
              {/* Overview Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs">
                <div>
                  <span className="text-muted-foreground block font-medium">Type / Category</span>
                  <span className="font-semibold text-foreground capitalize">
                    {fullReviewItem.contentType || fullReviewItem.platform || fullReviewItem.category || fullReviewItem.itemKind?.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Duration / Time Limit</span>
                  <span className="font-semibold text-foreground">
                    {fullReviewItem.duration || (fullReviewItem.timeLimitMinutes ? `${fullReviewItem.timeLimitMinutes} min` : "—")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Price</span>
                  <span className="font-semibold text-foreground">
                    {fullReviewItem.is_free ? <Badge variant="secondary" className="text-[10px]">Free</Badge> : (fullReviewItem.price != null ? `$${fullReviewItem.price}` : "Free")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium font-semibold">Level / Items</span>
                  <span className="font-semibold text-foreground capitalize">
                    {fullReviewItem.level || (fullReviewItem.questionCount != null ? `${fullReviewItem.questionCount} Questions` : "Standard")}
                  </span>
                </div>
              </div>

              {/* Clean Main Description */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Published / Main Description
                </h4>
                <Card className="bg-background">
                  <CardContent className="p-4 text-sm leading-relaxed whitespace-pre-wrap">
                    {stripHtmlToPlain(fullReviewItem.description) || "No description provided."}
                  </CardContent>
                </Card>
              </div>

              {/* PENDING EDITS & DIFF HIGHLIGHTING SECTION */}
              {fullReviewItem.draft_data ? (
                <div className="p-4 rounded-xl bg-amber-50/90 border-2 border-amber-400 dark:bg-amber-950/30 dark:border-amber-700 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-amber-300 dark:border-amber-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-sm shadow-xs">
                        ⚡
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-amber-950 dark:text-amber-100">
                          Submitted Edits & Changes To Review
                        </h4>
                        <p className="text-xs text-amber-800 dark:text-amber-300">
                          Comparing published original version against author's new submitted changes.
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-amber-600 hover:bg-amber-600 text-white text-xs px-2.5 py-1 font-semibold">
                      Draft Pending Approval
                    </Badge>
                  </div>

                  {/* Title Diff */}
                  <div className="space-y-1 text-xs">
                    <span className="font-semibold text-amber-900 dark:text-amber-200">Title Comparison:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-lg border bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200 border-red-200">
                        <span className="text-[10px] font-bold block uppercase text-red-600">Original Published Title</span>
                        {fullReviewItem.title || "—"}
                      </div>
                      <div className="p-2.5 rounded-lg border bg-emerald-100 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-400 font-bold shadow-xs">
                        <span className="text-[10px] font-bold block uppercase text-emerald-700 dark:text-emerald-400">New Submitted Title (Highlighted)</span>
                        {fullReviewItem.draft_data.title || fullReviewItem.title || "—"}
                      </div>
                    </div>
                  </div>

                  {/* Description Diff */}
                  <div className="space-y-1 text-xs">
                    <span className="font-semibold text-amber-900 dark:text-amber-200">Description Comparison:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-lg border bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200 border-red-200 text-xs">
                        <span className="text-[10px] font-bold block uppercase text-red-600">Original Description</span>
                        {stripHtmlToPlain(fullReviewItem.description) || "—"}
                      </div>
                      <div className="p-2.5 rounded-lg border bg-emerald-100 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-400 text-xs font-semibold shadow-xs">
                        <span className="text-[10px] font-bold block uppercase text-emerald-700 dark:text-emerald-400">New Submitted Description (Cleaned Text)</span>
                        {stripHtmlToPlain(fullReviewItem.draft_data.description || fullReviewItem.description)}
                      </div>
                    </div>
                  </div>

                  {/* Time Limit / Passing Percentage Diff */}
                  {(fullReviewItem.draft_data.timeLimitMinutes !== undefined && fullReviewItem.draft_data.timeLimitMinutes !== fullReviewItem.timeLimitMinutes) ||
                   (fullReviewItem.draft_data.passingPercentage !== undefined && fullReviewItem.draft_data.passingPercentage !== fullReviewItem.passingPercentage) ? (
                    <div className="flex flex-wrap gap-3 text-xs pt-1">
                      {fullReviewItem.draft_data.timeLimitMinutes !== undefined && (
                        <div className="p-2 px-3 bg-emerald-100 border border-emerald-300 rounded-md text-emerald-950 font-medium">
                          <span className="font-bold">Time Limit:</span> {fullReviewItem.timeLimitMinutes || "None"} min ➔ <span className="font-extrabold text-emerald-700">{fullReviewItem.draft_data.timeLimitMinutes} min</span>
                        </div>
                      )}
                      {fullReviewItem.draft_data.passingPercentage !== undefined && (
                        <div className="p-2 px-3 bg-emerald-100 border border-emerald-300 rounded-md text-emerald-950 font-medium">
                          <span className="font-bold">Passing %:</span> {fullReviewItem.passingPercentage || "None"}% ➔ <span className="font-extrabold text-emerald-700">{fullReviewItem.draft_data.passingPercentage}%</span>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Questions Diff for Exam Topics / Learning Sets */}
                  {Array.isArray(fullReviewItem.draft_data.questions) && (
                    <div className="space-y-2 pt-2 border-t border-amber-300 dark:border-amber-800">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-amber-900 dark:text-amber-200">
                          Submitted Questions ({fullReviewItem.draft_data.questions.length} questions in draft)
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-900 border-emerald-300 font-bold">
                          Draft Set Questions
                        </Badge>
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {fullReviewItem.draft_data.questions.map((q, qIdx) => {
                          const origQ = (fullReviewItem.questions || [])[qIdx];
                          const isNew = !origQ;
                          const isChanged = origQ && (origQ.question !== q.question || JSON.stringify(origQ.options) !== JSON.stringify(q.options));

                          return (
                            <div
                              key={qIdx}
                              className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                                isNew
                                  ? "bg-emerald-100/90 border-emerald-400 dark:bg-emerald-950/50 dark:border-emerald-800"
                                  : isChanged
                                  ? "bg-amber-100/80 border-amber-400 dark:bg-amber-950/50 dark:border-amber-800"
                                  : "bg-background border-slate-200"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-foreground">
                                  Q{qIdx + 1}. {q.question}
                                </span>
                                {isNew && (
                                  <Badge className="bg-emerald-600 text-white text-[9px] font-bold">
                                    + NEW QUESTION
                                  </Badge>
                                )}
                                {!isNew && isChanged && (
                                  <Badge variant="outline" className="bg-amber-200 text-amber-950 border-amber-400 text-[9px] font-bold">
                                    EDITED
                                  </Badge>
                                )}
                              </div>

                              {/* Options */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                                {q.options?.map((opt, optIdx) => {
                                  const isCorrect = Array.isArray(q.correctOptionIds)
                                    ? q.correctOptionIds.includes(opt.id)
                                    : q.correctOptionId === opt.id;
                                  return (
                                    <div
                                      key={optIdx}
                                      className={`p-1.5 px-2.5 rounded text-[11px] flex items-center justify-between border ${
                                        isCorrect
                                          ? "bg-emerald-200 border-emerald-500 font-bold text-emerald-950"
                                          : "bg-muted/40 border-transparent text-muted-foreground"
                                      }`}
                                    >
                                      <span>{opt.text}</span>
                                      {isCorrect && (
                                        <Badge className="text-[8px] bg-emerald-700 text-white h-3.5 px-1.5 font-bold">
                                          Correct
                                        </Badge>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : fullReviewItem.status === "pending" ? (
                /* NEW CONTENT SUBMISSION HIGHLIGHTING */
                <div className="p-4 rounded-xl bg-emerald-50/90 border-2 border-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-700 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm shadow-xs">
                        ✨
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-emerald-950 dark:text-emerald-100">
                          New Content Submission Pending Approval
                        </h4>
                        <p className="text-xs text-emerald-800 dark:text-emerald-300">
                          All submitted details are highlighted in green for approver verification.
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-xs px-2.5 py-1 font-semibold">
                      New Submission
                    </Badge>
                  </div>

                  <div className="space-y-1 text-xs">
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200">Submitted Title:</span>
                    <div className="p-3 rounded-lg border bg-emerald-100 text-emerald-950 border-emerald-400 font-bold text-sm shadow-xs">
                      {fullReviewItem.title}
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <span className="font-semibold text-emerald-900 dark:text-emerald-200">Submitted Description:</span>
                    <div className="p-3 rounded-lg border bg-emerald-100 text-emerald-950 border-emerald-400 text-xs font-medium leading-relaxed whitespace-pre-wrap shadow-xs">
                      {stripHtmlToPlain(fullReviewItem.description) || "No description provided."}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Existing Questions List */}
              {!fullReviewItem.draft_data && Array.isArray(fullReviewItem.questions) && fullReviewItem.questions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Questions List ({fullReviewItem.questions.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {fullReviewItem.questions.map((q, qIdx) => (
                      <div key={qIdx} className="p-3 rounded-lg border bg-background text-xs space-y-1.5">
                        <div className="font-semibold text-foreground">
                          Q{qIdx + 1}. {q.question}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {q.options?.map((opt, optIdx) => {
                            const isCorrect = Array.isArray(q.correctOptionIds)
                              ? q.correctOptionIds.includes(opt.id)
                              : q.correctOptionId === opt.id;
                            return (
                              <div
                                key={optIdx}
                                className={`p-1.5 px-2.5 rounded text-[11px] flex items-center justify-between border ${
                                  isCorrect
                                    ? "bg-emerald-100 border-emerald-400 font-semibold text-emerald-950"
                                    : "bg-muted/40 border-transparent text-muted-foreground"
                                }`}
                              >
                                <span>{opt.text}</span>
                                {isCorrect && (
                                  <Badge className="text-[8px] bg-emerald-600 text-white h-3.5 px-1">
                                    Correct
                                  </Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-4">
            <Button variant="outline" onClick={() => setFullReviewOpen(false)}>
              Close Review
            </Button>

            {fullReviewItem && fullReviewItem.status === "pending" && (
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setFullReviewOpen(false);
                    setSelectedItem(fullReviewItem);
                    setRejectDialogOpen(true);
                  }}
                  className="gap-1.5"
                >
                  <X className="w-4 h-4" />
                  Quick Reject
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-medium"
                  onClick={async () => {
                    setFullReviewOpen(false);
                    await handleQuickApprove(fullReviewItem.id || fullReviewItem, fullReviewItem.itemKind);
                  }}
                >
                  <Check className="w-4 h-4" />
                  Quick Approve
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        <Button
          type="button"
          size="lg"
          className="h-14 rounded-full px-6 shadow-lg gap-2"
          title={
            firstLabSlugToRun
              ? "Open the lab runner for a listed lab"
              : "Open the public labs catalog to pick a lab"
          }
          onClick={() => {
            if (firstLabSlugToRun) {
              navigate(`/labs/${encodeURIComponent(firstLabSlugToRun)}/start`);
            } else {
              navigate("/labs");
            }
          }}
        >
          <Play className="h-5 w-5" />
          Start a lab
        </Button>
      </div>
    </>
  );
}