import { useState, useMemo } from "react";
import { useGetCoursesQuery, useSetCourseContentApprovalMutation } from "@/store/api/courseApi";
import { useGetLabsQuery, useSetLabContentApprovalMutation } from "@/store/api/labApi";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { hasPermission } from "@/utils/permissions";
import GlobalListManager from "../../components/common/Globallistmanager";
import GlobalPagination from "../../components/common/Pagination";
import { toast } from "@/lib/toast";
import ContentTypeBadge from "../../components/common/ContentTypeBadge";

const LAB_DIFFICULTY_LABEL = {
  easy: "Beginner",
  medium: "Intermediate",
  hard: "Advanced",
};

export default function ContentApproval() {
  const navigate = useNavigate();
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

  // Dialog States
  const [selectedItem, setSelectedItem] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const apiPendingCourses = useMemo(() => {
    const rows = pendingCQ?.data?.rows || pendingCQ?.rows || [];
    return rows.map((c) => {
      const approval = c.content_approval_status || "pending";
      const created = c.created_at || c.createdAt;
      return {
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
      };
    });
  }, [pendingCQ]);

  const coursesSource = apiPendingCourses;

  const apiPendingLabs = useMemo(() => {
    const rows = pendingLQ?.data?.rows || pendingLQ?.rows || [];
    return rows
      .filter((lab) => {
        const kind = lab.lab_kind || lab.metadata?.lab_kind || null;
        return kind === "skill_builder";
      })
      .map((lab) => {
        const approval = lab.content_approval_status || "pending";
        const created = lab.created_at || lab.createdAt;
        const level = LAB_DIFFICULTY_LABEL[lab.difficulty] || lab.difficulty || "—";
        const kind = lab.lab_kind || lab.metadata?.lab_kind || null;
        return {
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
          status:
            approval === "approved" ? "approved" : approval === "rejected" ? "rejected" : "pending",
          submitted_at: created ? String(created).slice(0, 10) : "",
          description: lab.description || "",
          duration:
            lab.time_limit_minutes != null ? `${lab.time_limit_minutes} min` : "—",
          is_free: lab.is_free,
          price: lab.price,
        };
      });
  }, [pendingLQ]);

  const labsSource = apiPendingLabs;

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

  const pendingCoursesCount = coursesSource.filter((c) => c.status === "pending").length;
  const pendingLabsCount = labsSource.filter((l) => l.status === "pending").length;

  const canApproveCourses =
    hasPermission("approve_courses") || hasPermission("approve_own_courses");
  const canApproveLabs =
    hasPermission("approve_labs") ||
    hasPermission("approve_courses") ||
    hasPermission("approve_own_labs");
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

  // Handlers
  const handleQuickApprove = async (itemId, type) => {
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
  };

  const handleQuickReject = async () => {
    if (!selectedItem) return;
    if (selectedItem.type === "course") {
      try {
        await setCourseApproval({ id: selectedItem.id, status: "rejected" }).unwrap();
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
    if (selectedItem.type === "lab") {
      try {
        await setLabApproval({ id: selectedItem.id, status: "rejected" }).unwrap();
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
  };

  const handleDelete = (itemId, type) => {
    if (confirm(`Are you sure you want to delete this ${type}?`)) {
      toast.success(`${type === "course" ? "Course" : "Lab"} deleted successfully`);
    }
  };

  const handlePreview = (item, type) => {
    setSelectedItem({ ...item, type });
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
      {(coursesListOwnOnly || labsListOwnOnly) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-800">
          {coursesListOwnOnly && labsListOwnOnly && (
            <span>
              You are viewing <strong>your own</strong> pending courses and labs. Users with full approval
              permissions see all authors.
            </span>
          )}
          {coursesListOwnOnly && !labsListOwnOnly && (
            <span>
              Pending <strong>courses</strong> are limited to those you created. Lab visibility follows
              your lab-approval permissions.
            </span>
          )}
          {!coursesListOwnOnly && labsListOwnOnly && (
            <span>
              Pending <strong>labs</strong> are limited to those you created.
            </span>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
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
                                <DropdownMenuItem onClick={() => handlePreview(course, "course")}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Preview Content
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    course.slug &&
                                    navigate(`/app/courses/${course.slug}/review`)
                                  }
                                  disabled={!course.slug || !canApproveCourses}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Full Review
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {canApproveCourses && course.status === "pending" && (
                                  <>
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
                                        setSelectedItem({ ...course, type: "course" });
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
            description="Review and approve submitted hands-on labs"
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
                                <DropdownMenuItem onClick={() => handlePreview(lab, "lab")}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Preview Content
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    lab.id && navigate(`/app/labs/${lab.id}/review`)
                                  }
                                  disabled={!lab.id || !canApproveLabs}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Full Review
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {canApproveLabs && lab.status === "pending" && (
                                  <>
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
                                        setSelectedItem({ ...lab, type: "lab" });
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
      </Tabs>

      {/* Quick Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Reject {selectedItem?.type === "course" ? "Course" : "Lab"}</DialogTitle>
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
                `Reject ${selectedItem?.type === "course" ? "Course" : "Lab"}`
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
              {selectedItem?.type === "course" ? (
                <GraduationCap className="h-5 w-5" />
              ) : (
                <Beaker className="h-5 w-5" />
              )}
              {selectedItem?.type === "course" ? (
                <ContentTypeBadge kind="course" />
              ) : (
                <ContentTypeBadge
                  kind={selectedItem?.lab_kind === "skill_builder" ? "skill_builder" : "lab"}
                />
              )}
              <span className="font-semibold">{selectedItem?.title}</span>
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.type === "course" ? "Course" : "Lab"} Content Preview
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
                {selectedItem.type === "course" ? (
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
                        ) : (
                          `$${selectedItem.price}`
                        )}
                      </p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Level</p>
                  <p className="text-sm capitalize">{selectedItem.level}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm">{selectedItem.description}</p>
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
              {selectedItem.type === "lab" && selectedItem.steps && selectedItem.steps.length > 0 && (
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
              onClick={() => {
                setPreviewDialogOpen(false);
                if (selectedItem?.type === "course" && selectedItem?.slug) {
                  navigate(`/app/courses/${selectedItem.slug}/review`);
                } else if (selectedItem?.type === "lab" && selectedItem?.id) {
                  navigate(`/app/labs/${selectedItem.id}/review`);
                }
              }}
              disabled={
                selectedItem?.type === "course"
                  ? !selectedItem?.slug || !canApproveCourses
                  : !selectedItem?.id || !canApproveLabs
              }
            >
              Full Review
            </Button>
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