import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  BookOpen,
  FlaskConical,
  DollarSign,
  LoaderCircle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  UserCheck,
  Video,
  UserPlus,
  Clock,
  GraduationCap,
  Activity,
  Award,
  Compass,
  CreditCard,
  LifeBuoy,
  Flame,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useGetAdminSupportTicketsQuery } from '@/store/api/supportApi';
import { useGetDashboardStatsQuery } from '@/store/api/userApi';
import { useGetPublicCoursesQuery, useGetCoursesQuery } from '@/store/api/courseApi';
import { useGetPublicLabsQuery, useGetLabsQuery } from '@/store/api/labApi';
import { useGetPendingExamTopicsSetsQuery } from '@/store/api/examTopicsApi';
import { useGetMyPaymentHistoryQuery } from '@/store/api/learningApi';
import { hasPermission, hasAnyPermission } from '@/utils/permissions';
import { isSuperAdmin, isAdmin, isApprover, getUserFullName, getCurrentUser, isStudent, hasRole } from '@/lib/auth';
import { CourseCard } from '@/components/cards/CourseCard';
import { LabCard } from '@/components/cards/LabCard';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { resolveLabCardRating, resolveLabCardEnrolledCount } from '@/lib/labDisplayStats';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { formatDate } from '@/utils/formatters';

const getDailyStreakCount = (userEmail) => {
  if (!userEmail) return 1;
  const storageKey = `daily_streak_${userEmail.toLowerCase()}`;
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.date === todayStr) {
        return data.streak || 1;
      } else if (data.date === yesterdayStr) {
        return data.streak || 1;
      }
    }
    return 1;
  } catch {
    return 1;
  }
};

const ADMIN_STAT_CONFIG = [
  {
    key: 'courses',
    fallbackKey: 'my_courses',
    label: 'Total Courses',
    icon: BookOpen,
    gradient: 'from-emerald-500/10 to-teal-500/20 text-emerald-600 border-emerald-200/50',
    iconBg: 'bg-emerald-500 text-white shadow-emerald-500/25',
  },
  {
    key: 'labs',
    fallbackKey: 'my_labs',
    label: 'Total Labs',
    icon: FlaskConical,
    gradient: 'from-purple-500/10 to-indigo-500/20 text-purple-600 border-purple-200/50',
    iconBg: 'bg-purple-500 text-white shadow-purple-500/25',
  },
  {
    key: 'purchases',
    label: 'Total Revenue',
    icon: DollarSign,
    gradient: 'from-amber-500/10 to-orange-500/20 text-amber-600 border-amber-200/50',
    iconBg: 'bg-amber-500 text-white shadow-amber-500/25',
  },
  {
    key: 'users',
    label: 'Total Users',
    icon: Users,
    gradient: 'from-blue-500/10 to-cyan-500/20 text-blue-600 border-blue-200/50',
    iconBg: 'bg-blue-500 text-white shadow-blue-500/25',
  },
  {
    key: 'instructors',
    label: 'Instructors & Trainers',
    icon: UserCheck,
    gradient: 'from-indigo-500/10 to-violet-500/20 text-indigo-600 border-indigo-200/50',
    iconBg: 'bg-indigo-500 text-white shadow-indigo-500/25',
  },
  {
    key: 'webinars',
    label: 'Live Webinars',
    icon: Video,
    gradient: 'from-rose-500/10 to-pink-500/20 text-rose-600 border-rose-200/50',
    iconBg: 'bg-rose-500 text-white shadow-rose-500/25',
  },
];

const getItemCurrency = (item) => {
  if (item?.currency) return item.currency;
  if (!item?.metadata) return 'INR';
  let m = item.metadata;
  if (typeof m === 'string') {
    try { m = JSON.parse(m); } catch { return 'INR'; }
  }
  if (typeof m === 'string') {
    try { m = JSON.parse(m); } catch { return 'INR'; }
  }
  return m?.currency || 'INR';
};

const safeArray = (val) => {
  if (!val || typeof val !== 'object') return [];
  if (Array.isArray(val)) return val;
  if (Array.isArray(val.data)) return val.data;
  if (Array.isArray(val.rows)) return val.rows;
  if (Array.isArray(val.courses)) return val.courses;
  if (Array.isArray(val.labs)) return val.labs;
  if (Array.isArray(val.pending)) return val.pending;
  if (Array.isArray(val.sets)) return val.sets;

  if (val.data && typeof val.data === 'object') {
    if (Array.isArray(val.data)) return val.data;
    if (Array.isArray(val.data.rows)) return val.data.rows;
    if (Array.isArray(val.data.courses)) return val.data.courses;
    if (Array.isArray(val.data.labs)) return val.data.labs;
    if (Array.isArray(val.data.pending)) return val.data.pending;
    if (Array.isArray(val.data.sets)) return val.data.sets;

    if (val.data.data && typeof val.data.data === 'object') {
      if (Array.isArray(val.data.data)) return val.data.data;
      if (Array.isArray(val.data.data.rows)) return val.data.data.rows;
      if (Array.isArray(val.data.data.courses)) return val.data.data.courses;
      if (Array.isArray(val.data.data.labs)) return val.data.data.labs;
      if (Array.isArray(val.data.data.pending)) return val.data.data.pending;
      if (Array.isArray(val.data.data.sets)) return val.data.data.sets;
    }
  }

  return [];
};

const ApproverDashboardView = ({ userName }) => {
  const navigate = useNavigate();
  const { data: coursesRes, isLoading: coursesLoading } = useGetCoursesQuery({ limit: 100 });
  const { data: labsRes, isLoading: labsLoading } = useGetLabsQuery({ limit: 100 });
  const { data: examTopicsRes, isLoading: examTopicsLoading } = useGetPendingExamTopicsSetsQuery();

  const courses = useMemo(() => safeArray(coursesRes), [coursesRes]);
  const labs = useMemo(() => safeArray(labsRes), [labsRes]);
  const examTopics = useMemo(() => safeArray(examTopicsRes), [examTopicsRes]);

  // Compute Stats safely in a single block
  const {
    pendingCourses,
    approvedCourses,
    rejectedCourses,
    pendingLabs,
    approvedLabs,
    rejectedLabs,
    pendingExamTopics,
    approvedExamTopics,
    rejectedExamTopics,
    pendingTotal,
    approvedTotal,
    rejectedTotal,
    totalReviewed,
    successRate,
  } = useMemo(() => {
    const cList = Array.isArray(courses) ? courses : [];
    const lList = Array.isArray(labs) ? labs : [];
    const eList = Array.isArray(examTopics) ? examTopics : [];

    const pCourses = cList.filter((c) => c && typeof c === 'object' && (c.content_approval_status || 'pending') === 'pending');
    const aCourses = cList.filter((c) => c && typeof c === 'object' && c.content_approval_status === 'approved');
    const rCourses = cList.filter((c) => c && typeof c === 'object' && c.content_approval_status === 'rejected');

    const pLabs = lList.filter((l) => l && typeof l === 'object' && (l.content_approval_status || 'pending') === 'pending');
    const aLabs = lList.filter((l) => l && typeof l === 'object' && l.content_approval_status === 'approved');
    const rLabs = lList.filter((l) => l && typeof l === 'object' && l.content_approval_status === 'rejected');

    const pExam = eList.filter((e) => e && typeof e === 'object' && (e.content_approval_status || 'pending') === 'pending');
    const aExam = eList.filter((e) => e && typeof e === 'object' && e.content_approval_status === 'approved');
    const rExam = eList.filter((e) => e && typeof e === 'object' && e.content_approval_status === 'rejected');

    const pTot = pCourses.length + pLabs.length + pExam.length;
    const aTot = aCourses.length + aLabs.length + aExam.length;
    const rTot = rCourses.length + rLabs.length + rExam.length;
    const reviewed = aTot + rTot;
    const sRate = reviewed > 0 ? Math.round((aTot / reviewed) * 100) : 100;

    return {
      pendingCourses: pCourses,
      approvedCourses: aCourses,
      rejectedCourses: rCourses,
      pendingLabs: pLabs,
      approvedLabs: aLabs,
      rejectedLabs: rLabs,
      pendingExamTopics: pExam,
      approvedExamTopics: aExam,
      rejectedExamTopics: rExam,
      pendingTotal: pTot,
      approvedTotal: aTot,
      rejectedTotal: rTot,
      totalReviewed: reviewed,
      successRate: sRate,
    };
  }, [courses, labs, examTopics]);

  // Combine Recent Requests
  const recentRequests = useMemo(() => {
    const requests = [
      ...courses.filter(Boolean).map((c) => ({
        id: c.id || c._id || Math.random(),
        type: 'Course',
        title: c.title || 'Untitled Course',
        author: c.author_name || c.instructor || c.creator?.name || 'Instructor',
        submittedAt: c.created_at || c.createdAt || c.updated_at || null,
        status: String(c.content_approval_status || 'pending'),
        link: '/app/course-approval',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
        icon: GraduationCap,
      })),
      ...labs.filter(Boolean).map((l) => ({
        id: l.id || l._id || Math.random(),
        type: 'Lab',
        title: l.title || 'Untitled Lab',
        author: l.author_name || l.instructor || l.creator?.name || 'Instructor',
        submittedAt: l.created_at || l.createdAt || l.updated_at || null,
        status: String(l.content_approval_status || 'pending'),
        link: '/app/course-approval',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
        icon: FlaskConical,
      })),
      ...examTopics.filter(Boolean).map((e) => ({
        id: e.setId || e.id || e._id || Math.random(),
        type: 'Exam Topic',
        title: e.title || 'Untitled Exam Set',
        author: e.author_name || e.author || 'Super Admin',
        submittedAt: e.updatedAt || e.created_at || e.createdAt || null,
        status: String(e.content_approval_status || 'pending'),
        link: '/app/course-approval',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        icon: BookOpen,
      })),
    ];

    return requests.sort((a, b) => {
      const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });
  }, [courses, labs, examTopics]);

  const isLoading = coursesLoading || labsLoading || examTopicsLoading;

  const APPROVER_STAT_CONFIG = [
    {
      key: 'pending_approvals',
      label: 'Pending Approvals',
      value: pendingTotal,
      subtext: `${pendingCourses.length} Courses · ${pendingLabs.length} Labs · ${pendingExamTopics.length} Exam Sets`,
      icon: Clock,
      to: '/app/course-approval',
      gradient: 'from-amber-500/10 to-orange-500/20 text-amber-600 border-amber-200/50 dark:border-amber-900/50',
      iconBg: 'bg-amber-500 text-white shadow-amber-500/25',
    },
    {
      key: 'approved_content',
      label: 'Approved Content',
      value: approvedTotal,
      subtext: 'Live & published resources',
      icon: UserCheck,
      to: '/app/course-approval',
      gradient: 'from-emerald-500/10 to-teal-500/20 text-emerald-600 border-emerald-200/50 dark:border-emerald-900/50',
      iconBg: 'bg-emerald-500 text-white shadow-emerald-500/25',
    },
    {
      key: 'rejected_content',
      label: 'Rejected Content',
      value: rejectedTotal,
      subtext: 'Sent back for revisions',
      icon: Flame,
      to: '/app/course-approval',
      gradient: 'from-rose-500/10 to-pink-500/20 text-rose-600 border-rose-200/50 dark:border-rose-900/50',
      iconBg: 'bg-rose-500 text-white shadow-rose-500/25',
    },
    {
      key: 'success_rate',
      label: 'Approval Rate',
      value: `${successRate}%`,
      subtext: `${totalReviewed} total items reviewed`,
      icon: Award,
      to: '/app/course-approval',
      gradient: 'from-indigo-500/10 to-violet-500/20 text-indigo-600 border-indigo-200/50 dark:border-indigo-900/50',
      iconBg: 'bg-indigo-500 text-white shadow-indigo-500/25',
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Content Approver Dashboard
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {userName}! 👋
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Review content submissions, manage pending courses, labs, and exam topics, and uphold educational quality across the platform.
            </p>
          </div>
          <Link
            to="/app/course-approval"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-100 transition-colors shadow-lg shrink-0 text-sm"
          >
            Review Pending Content <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {APPROVER_STAT_CONFIG.map((cfg) => {
          const Icon = cfg.icon;
          return (
            <Card
              key={cfg.key}
              onClick={() => navigate(cfg.to)}
              className={`relative overflow-hidden border transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer bg-gradient-to-br ${cfg.gradient}`}
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{cfg.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">{cfg.value}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{cfg.subtext}</p>
                </div>
                <div className={`p-3 rounded-2xl shadow-lg ${cfg.iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Approval Requests Table */}
      <Card className="border border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-5 bg-muted/20 border-b border-border/60">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" /> Recent Approval Requests
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Latest submitted courses, labs, and exam topics awaiting your review
            </p>
          </div>
          <Link
            to="/app/course-approval"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            View All Pending ({pendingTotal}) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : recentRequests.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground space-y-2">
              <UserCheck className="w-10 h-10 mx-auto text-emerald-500/50" />
              <p className="font-semibold text-foreground">No Pending Requests</p>
              <p className="text-xs">All submitted content items have been reviewed!</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-5 py-3">Content Title & Type</th>
                    <th className="px-5 py-3">Submitted By</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recentRequests.slice(0, 8).map((req) => {
                    const TypeIcon = req.icon;
                    const status = String(req.status || 'pending').toLowerCase();

                    let statusBadge = (
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-semibold">
                        <Clock className="w-3 h-3 mr-1" /> Pending
                      </Badge>
                    );
                    if (status === 'approved') {
                      statusBadge = (
                        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold">
                          <UserCheck className="w-3 h-3 mr-1" /> Approved
                        </Badge>
                      );
                    } else if (status === 'rejected') {
                      statusBadge = (
                        <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-semibold">
                          <Flame className="w-3 h-3 mr-1" /> Rejected
                        </Badge>
                      );
                    }

                    return (
                      <tr key={`${req.type}-${req.id}`} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${req.badgeBg}`}>
                              <TypeIcon className="w-3.5 h-3.5" /> {req.type}
                            </span>
                            <span className="font-semibold text-foreground line-clamp-1">{req.title}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300">
                          {req.author}
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(req.submittedAt)}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {statusBadge}
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate('/app/course-approval')}
                            className="font-semibold"
                          >
                            Review
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const ContentCreatorDashboardView = ({ userName }) => {
  const navigate = useNavigate();
  const { data: coursesRes } = useGetCoursesQuery({ limit: 50 });
  const { data: labsRes } = useGetLabsQuery({ limit: 50 });

  const courses = useMemo(() => safeArray(coursesRes), [coursesRes]);
  const labs = useMemo(() => safeArray(labsRes), [labsRes]);

  const canCreateCourse = hasPermission('create_courses');
  const canCreateLab = hasPermission('create_labs');
  const canCreateProgram = hasPermission('create_programs');
  const canCreateWebinar = hasPermission('create_webinars');
  const canCreateExpertTraining = hasPermission('create_expert_led_training');
  const canCreateCloudService = hasPermission('create_cloud_services');
  const canCreateExamTopic = hasPermission('create_exam_topics');

  const creationOptions = [
    canCreateCourse && {
      key: 'course',
      label: 'Create Course',
      description: 'Build interactive video courses & modules',
      icon: BookOpen,
      to: '/app/courses/new',
      color: 'from-emerald-500/10 to-teal-500/20 text-emerald-600 border-emerald-200/50',
      iconBg: 'bg-emerald-500 text-white',
    },
    canCreateLab && {
      key: 'lab',
      label: 'Create Lab',
      description: 'Design real hands-on lab environments',
      icon: FlaskConical,
      to: '/app/labs/new',
      color: 'from-purple-500/10 to-indigo-500/20 text-purple-600 border-purple-200/50',
      iconBg: 'bg-purple-500 text-white',
    },
    canCreateWebinar && {
      key: 'webinar',
      label: 'Create Live Webinar',
      description: 'Schedule live technical webinars & sessions',
      icon: Video,
      to: '/app/webinar/create',
      color: 'from-blue-500/10 to-cyan-500/20 text-blue-600 border-blue-200/50',
      iconBg: 'bg-blue-500 text-white',
    },
    canCreateProgram && {
      key: 'program',
      label: 'Create Digital Program',
      description: 'Curate structured learning paths & tracks',
      icon: GraduationCap,
      to: '/app/digital-programs/cloud-services',
      color: 'from-indigo-500/10 to-purple-500/20 text-indigo-600 border-indigo-200/50',
      iconBg: 'bg-indigo-500 text-white',
    },
    canCreateExpertTraining && {
      key: 'expert_training',
      label: 'Create Expert-Led Training',
      description: 'Publish expert instructor led workshops',
      icon: UserCheck,
      to: '/app/expert-led-training',
      color: 'from-amber-500/10 to-orange-500/20 text-amber-600 border-amber-200/50',
      iconBg: 'bg-amber-500 text-white',
    },
    canCreateCloudService && {
      key: 'cloud_service',
      label: 'Create Cloud Service',
      description: 'Set up cloud sandbox & infrastructure labs',
      icon: Sparkles,
      to: '/app/digital-programs/cloud-services',
      color: 'from-cyan-500/10 to-sky-500/20 text-cyan-600 border-cyan-200/50',
      iconBg: 'bg-cyan-500 text-white',
    },
    canCreateExamTopic && {
      key: 'exam_topic',
      label: 'Create Exam Topic',
      description: 'Assemble practice exam sets & quizzes',
      icon: Award,
      to: '/app/exam-topics',
      color: 'from-rose-500/10 to-pink-500/20 text-rose-600 border-rose-200/50',
      iconBg: 'bg-rose-500 text-white',
    },
  ].filter(Boolean);

  const totalMyCourses = courses.length;
  const totalMyLabs = labs.length;
  const pendingCount = useMemo(() => {
    const pC = courses.filter((c) => c?.content_approval_status === 'pending').length;
    const pL = labs.filter((l) => l?.content_approval_status === 'pending').length;
    return pC + pL;
  }, [courses, labs]);

  return (
    <div className="space-y-8 p-1">
      {/* Creator Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg border border-slate-800">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-indigo-400/40 text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold">
                Content Creator Studio
              </Badge>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Create-Only Mode
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {userName}! 🚀
            </h1>
            <p className="mt-1 text-sm text-slate-300 max-w-2xl">
              Create and publish technical courses, labs, live webinars, and digital programs dynamically based on your assigned permissions.
            </p>
          </div>
        </div>
      </div>

      {/* Creator Dynamic Action Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          Allowed Content Creation Actions ({creationOptions.length})
        </h2>

        {creationOptions.length === 0 ? (
          <Card className="border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No content creation permissions enabled for your current role configuration.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {creationOptions.map((opt) => (
              <Card
                key={opt.key}
                className={`border bg-gradient-to-b ${opt.color} shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between`}
                onClick={() => navigate(opt.to)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 ${opt.iconBg} rounded-xl flex items-center justify-center shadow-md`}>
                      <opt.icon className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="bg-background/80 font-medium text-xs">Create Allowed</Badge>
                  </div>
                  <CardTitle className="text-base font-bold mt-3">{opt.label}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground mb-4">{opt.description}</p>
                  <Button size="sm" className="w-full justify-between" onClick={(e) => { e.stopPropagation(); navigate(opt.to); }}>
                    <span>Launch {opt.label}</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="border bg-card shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">My Courses Created</p>
              <h3 className="text-2xl font-black text-foreground mt-1">{totalMyCourses}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">My Labs Created</p>
              <h3 className="text-2xl font-black text-foreground mt-1">{totalMyLabs}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center font-bold">
              <FlaskConical className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Pending Approval</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const userIsSuperAdmin = isSuperAdmin();
  const userIsApprover = !userIsSuperAdmin && isApprover();
  const userIsCreator = !userIsSuperAdmin && !userIsApprover && (
    hasAnyPermission([
      'create_courses',
      'create_labs',
      'create_programs',
      'create_webinars',
      'create_expert_led_training',
      'create_cloud_services',
      'create_exam_topics'
    ]) || hasRole('creator') || hasRole('content_creator')
  );
  const userIsAdmin = userIsSuperAdmin || (isAdmin() && !userIsApprover && !userIsCreator) || (hasPermission('view_admin_dashboard') && !userIsApprover && !userIsCreator && !isStudent());
  const userName = getUserFullName() || 'User';

  const { data: statsRes, isLoading: statsLoading } = useGetDashboardStatsQuery(undefined, { skip: userIsApprover || userIsCreator });
  const { data: supportData } = useGetAdminSupportTicketsQuery({}, { skip: !userIsAdmin || userIsApprover || userIsCreator, refetchOnMountOrArgChange: true });
  const { data: coursesRes, isLoading: coursesLoading } = useGetPublicCoursesQuery({ page: 1, limit: 6 }, { skip: userIsAdmin || userIsApprover || userIsCreator });
  const { data: labsRes, isLoading: labsLoading } = useGetPublicLabsQuery({ page: 1, limit: 6 }, { skip: userIsAdmin || userIsApprover || userIsCreator });
  const { data: paymentsRes } = useGetMyPaymentHistoryQuery({}, { skip: !userIsAdmin || userIsApprover || userIsCreator, refetchOnMountOrArgChange: true });

  if (userIsApprover) {
    return <ApproverDashboardView userName={userName} />;
  }

  if (userIsCreator) {
    return <ContentCreatorDashboardView userName={userName} />;
  }

  const supportTickets = supportData?.data?.rows || supportData?.data?.tickets || supportData?.data || supportData?.rows || (Array.isArray(supportData) ? supportData : []);
  const stats = statsRes?.data?.data || statsRes?.data || {};
  const cards = Array.isArray(stats.cards) ? stats.cards : [];
  const recentUsers = Array.isArray(stats.recentUsers) ? stats.recentUsers : [];
  const recentActivity = Array.isArray(stats.recentActivity) ? stats.recentActivity : [];
  const recentPayments = Array.isArray(paymentsRes?.data?.history)
    ? paymentsRes.data.history
    : (Array.isArray(paymentsRes?.data) ? paymentsRes.data : []);

  const rawCourses = coursesRes?.data?.rows || coursesRes?.data?.courses || coursesRes?.data || coursesRes?.courses || coursesRes?.rows || (Array.isArray(coursesRes) ? coursesRes : []);
  const publicCourses = Array.isArray(rawCourses) ? rawCourses : (Array.isArray(rawCourses?.rows) ? rawCourses.rows : []);

  const rawLabs = labsRes?.data?.rows || labsRes?.data?.labs || labsRes?.data || labsRes?.labs || labsRes?.rows || (Array.isArray(labsRes) ? labsRes : []);
  const publicLabs = Array.isArray(rawLabs) ? rawLabs : (Array.isArray(rawLabs?.rows) ? rawLabs.rows : []);

  // Map stat values from backend
  const getStatValue = (cfg) => {
    const cardItem = cards.find((c) => c.key === cfg.key || c.key === cfg.fallbackKey);
    if (cardItem && cardItem.value !== undefined) return cardItem.value;
    if (stats.admin && stats.admin[cfg.key] !== undefined) return stats.admin[cfg.key];
    return 0;
  };

  if (statsLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <LoaderCircle className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          {userIsAdmin ? 'Loading Executive Dashboard...' : 'Loading Student Portal...'}
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STUDENT DASHBOARD VIEW
  // -------------------------------------------------------------
  if (!userIsAdmin) {
    const studentCoursesEnrolled = stats?.personal?.coursesEnrolled || 0;
    const studentLabsEnrolled = stats?.personal?.labsEnrolled || 0;
    const currentUserObj = getCurrentUser();
    const studentStreakCount = getDailyStreakCount(currentUserObj?.email || userName);

    const STUDENT_STAT_CONFIG = [
      {
        key: 'my_courses',
        label: 'My Courses',
        value: studentCoursesEnrolled,
        icon: BookOpen,
        to: '/app/my-learning',
        gradient: 'from-emerald-500/10 to-teal-500/20 text-emerald-600 border-emerald-200/50',
        iconBg: 'bg-emerald-500 text-white shadow-emerald-500/25',
      },
      {
        key: 'my_labs',
        label: 'My Labs',
        value: studentLabsEnrolled,
        icon: FlaskConical,
        to: '/app/my-labs',
        gradient: 'from-purple-500/10 to-indigo-500/20 text-purple-600 border-purple-200/50',
        iconBg: 'bg-purple-500 text-white shadow-purple-500/25',
      },
      {
        key: 'daily_streak',
        label: 'Daily Streak',
        value: `${studentStreakCount} ${studentStreakCount === 1 ? 'Day' : 'Days'} 🔥`,
        icon: Flame,
        to: '/app/my-learning',
        gradient: 'from-amber-500/10 to-orange-500/20 text-orange-600 border-orange-200/50',
        iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-orange-500/25',
      },
    ];

    return (
      <div className="space-y-8 p-1">
        {/* Student Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg border border-slate-800">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="border-indigo-400/40 text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold">
                  Student Learning Portal
                </Badge>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" /> Welcome Back
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Welcome back, {userName}! 👋
              </h1>
              <p className="mt-1 text-sm text-slate-300 max-w-2xl">
                Track your active enrolled courses, practice hands-on labs, and achieve your technical milestones.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start md:self-auto">
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
              >
                <Compass className="w-4 h-4" /> Explore Courses
              </Link>
              <Link
                to="/labs"
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-purple-700"
              >
                <FlaskConical className="w-4 h-4" /> Explore Labs
              </Link>
            </div>
          </div>
        </div>

        {/* 3 Student Key Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STUDENT_STAT_CONFIG.map((cfg) => (
            <Link key={cfg.key} to={cfg.to}>
              <Card className={`border bg-gradient-to-b ${cfg.gradient} shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer h-full`}>
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">{cfg.label}</p>
                    <h3 className="text-3xl font-black tracking-tight text-foreground">{cfg.value}</h3>
                  </div>
                  <div className={`w-12 h-12 ${cfg.iconBg} rounded-xl flex items-center justify-center shadow-md`}>
                    <cfg.icon className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Recommended & Trending Courses */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <h2 className="text-xl font-bold text-foreground">Featured Courses</h2>
            </div>
            <Link to="/courses" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              View All Courses <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {coursesLoading ? (
            <div className="flex items-center justify-center p-8">
              <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : publicCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses available right now.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-stretch">
              {publicCourses.slice(0, 4).map((c) => (
                <CourseCard
                  key={c.id || c._id}
                  id={c.id || c._id}
                  slug={c.slug}
                  title={c.title}
                  description={c.description || ""}
                  thumbnail={resolveMediaUrl(c.thumbnail || c.thumbnailUrl || c.image) || ""}
                  isFree={c.isFree ?? c.is_free ?? false}
                  price={c.price ?? 0}
                  currency={getItemCurrency(c)}
                  duration={c.duration || "Self-paced"}
                  level={c.level || "Beginner"}
                  rating={c.rating ?? 0}
                  enrolledCount={c.enrolledCount ?? c.enrolled_count ?? 0}
                  modulesCount={c.modulesCount ?? c.modules_count ?? 0}
                  labsCount={c.labsCount ?? c.labs_count ?? 0}
                  platform={c.platform || c.vendor_platform || ""}
                  vendorPlatform={c.platform || c.vendor_platform || ""}
                  status={c.status}
                  courseCode={c.course_code}
                  version={c.version}
                  showActions={false}
                  showAdminDates={false}
                  prefetchOverview={false}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recommended & Popular Hands-On Labs */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <h2 className="text-xl font-bold text-foreground">Popular Hands-On Labs</h2>
            </div>
            <Link to="/labs" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              View All Labs <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {labsLoading ? (
            <div className="flex items-center justify-center p-8">
              <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : publicLabs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No labs available right now.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-stretch">
              {publicLabs.slice(0, 4).map((lab) => {
                const isFree = lab.isFree ?? lab.is_free ?? !!(lab.price === 0 || lab.price === "0.00");
                const level = lab.level || (lab.difficulty ? lab.difficulty.charAt(0).toUpperCase() + lab.difficulty.slice(1) : "Easy");
                const duration = lab.duration || (typeof lab.time_limit_minutes === "number" ? `${lab.time_limit_minutes} min` : "15 min");
                const labKind = lab.lab_kind === "skill_builder" || lab.metadata?.lab_kind === "skill_builder" ? "skill_builder" : "lab";

                return (
                  <LabCard
                    key={lab.id || lab._id}
                    id={lab.id || lab._id}
                    slug={lab.slug}
                    title={lab.title}
                    description={lab.description}
                    thumbnail={resolveMediaUrl(lab.thumbnail || lab.thumbnail_url || lab.image)}
                    isFree={isFree}
                    price={lab.price}
                    currency={getItemCurrency(lab)}
                    duration={duration}
                    level={level}
                    rating={resolveLabCardRating(lab)}
                    enrolledCount={resolveLabCardEnrolledCount(lab)}
                    labKind={labKind}
                    status={lab.status}
                    labCode={lab.lab_code}
                    version={lab.version}
                    platform={lab.platform}
                    showActions={false}
                    showAdminDates={false}
                    prefetchOverview={false}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SUPER ADMIN / ADMIN EXECUTIVE DASHBOARD VIEW
  // -------------------------------------------------------------
  return (
    <div className="space-y-8 p-1">
      {/* Super Admin Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg border border-slate-800">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-indigo-400/40 text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold">
                Super Admin Console
              </Badge>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Platform Live Overview
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Platform Analytics & Executive Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-300 max-w-2xl">
              Monitor key business metrics, total courses, labs, revenue growth, recent users, and content activity in real-time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            {hasPermission('create_courses') && (
              <Link
                to="/app/courses/new"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
              >
                <BookOpen className="w-4 h-4" /> Add Course
              </Link>
            )}
            {hasPermission('create_labs') && (
              <Link
                to="/app/labs/new"
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-purple-700"
              >
                <FlaskConical className="w-4 h-4" /> Add Lab
              </Link>
            )}
            {hasPermission('create_users') && (
              <Link
                to="/app/users/new"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-blue-700"
              >
                <UserPlus className="w-4 h-4" /> Add New User
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Top 6 KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {ADMIN_STAT_CONFIG.map((cfg) => {
          const val = getStatValue(cfg);
          return (
            <Card key={cfg.key} className={`border bg-gradient-to-b ${cfg.gradient} shadow-sm hover:shadow-md transition-all duration-200`}>
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 ${cfg.iconBg} rounded-xl flex items-center justify-center shadow-sm`}>
                    <cfg.icon className="w-5 h-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-900/80 border-slate-300/60 dark:border-slate-700/60 shadow-xs">
                    Platform
                  </Badge>
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-foreground">{val ?? 0}</h3>
                  <p className="text-xs font-semibold text-muted-foreground mt-0.5">{cfg.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 2x2 Activity & Management Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Left: Recent Registered Users */}
        <Card className="border shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Recent Registered Users</CardTitle>
                  <p className="text-xs text-muted-foreground">Latest signups across the platform</p>
                </div>
              </div>
              <Link to="/app/users" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                View All Users <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentUsers.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No recent user registrations found.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {recentUsers.slice(0, 3).map((usr) => (
                    <Link
                      key={usr.id}
                      to={`/app/users/${usr.id}/details`}
                      className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase border border-primary/20">
                          {usr.name ? usr.name.charAt(0) : 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{usr.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{usr.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-[11px] font-medium capitalize bg-slate-100 dark:bg-slate-800">
                          {usr.role || 'User'}
                        </Badge>
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" /> {formatDate(usr.created_at)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </div>
        </Card>

        {/* Top Right: Recent Payment Activity */}
        <Card className="border shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Recent Payment Activity</CardTitle>
                  <p className="text-xs text-muted-foreground">Latest purchases & transactions</p>
                </div>
              </div>
              <Link to="/app/payment-history" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                View All Payments <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentPayments.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No recent payment transactions found.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {recentPayments.slice(0, 3).map((pay) => {
                    const type = pay.itemType || 'Purchase';
                    const isCourse = type === 'Course';
                    const isLab = type === 'Lab';
                    const isProgram = type === 'Program' || type === 'Training Program';
                    const isWebinar = type === 'Webinar';

                    let badgeBg = 'bg-slate-500/10 text-slate-600';
                    if (isCourse) badgeBg = 'bg-emerald-500/10 text-emerald-600';
                    else if (isLab) badgeBg = 'bg-purple-500/10 text-purple-600';
                    else if (isProgram) badgeBg = 'bg-blue-500/10 text-blue-600';
                    else if (isWebinar) badgeBg = 'bg-rose-500/10 text-rose-600';

                    return (
                      <Link
                        key={pay.id || pay.paymentId}
                        to="/app/payment-history"
                        className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs uppercase border border-emerald-500/20">
                            {pay.user?.name ? pay.user.name.charAt(0) : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{pay.user?.name || 'User'}</p>
                              <Badge variant="secondary" className={`text-[10px] py-0 px-1.5 font-medium ${badgeBg}`}>
                                {type}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              Purchased <span className="font-medium text-foreground">{pay.itemTitle}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                            ₹{Number(pay.amount || 0).toLocaleString('en-IN')}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3" /> {formatDate(pay.date)}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </div>
        </Card>

        {/* Bottom Left: Recent Content Activity */}
        <Card className="border shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Recent Content Activity</CardTitle>
                  <p className="text-xs text-muted-foreground">Newly created courses & hands-on labs</p>
                </div>
              </div>
              <Link to="/app/courses/mine" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                View Catalog <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentActivity.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No recent content updates recorded.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {recentActivity.slice(0, 5).map((item) => {
                    const isCourse = item.type === 'Course';
                    const isLab = item.type === 'Lab';
                    const isWebinar = item.type === 'Webinar';
                    const isProgram = item.type === 'Program' || item.type === 'Training Program';

                    let targetUrl = `/app/courses/${item.slug || item.id}`;
                    if (isLab) targetUrl = `/app/labs/${item.slug || item.id}`;
                    if (isWebinar) targetUrl = `/app/live-webinars`;
                    if (isProgram) targetUrl = `/app/my-programs`;

                    let iconBg = 'bg-emerald-500';
                    let IconComponent = BookOpen;
                    if (isLab) {
                      iconBg = 'bg-purple-500';
                      IconComponent = FlaskConical;
                    } else if (isWebinar) {
                      iconBg = 'bg-rose-500';
                      IconComponent = Video;
                    } else if (isProgram) {
                      iconBg = 'bg-blue-500';
                      IconComponent = GraduationCap;
                    }

                    let badgeBg = 'bg-emerald-500/10 text-emerald-600';
                    if (isLab) badgeBg = 'bg-purple-500/10 text-purple-600';
                    if (isWebinar) badgeBg = 'bg-rose-500/10 text-rose-600';
                    if (isProgram) badgeBg = 'bg-blue-500/10 text-blue-600';

                    const isPublished = (item.status || '').toLowerCase() === 'published';

                    return (
                      <Link
                        key={`${item.type}-${item.id}`}
                        to={targetUrl}
                        className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm ${iconBg}`}>
                            <IconComponent className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{item.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="secondary" className={`text-[10px] py-0 px-1.5 font-medium ${badgeBg}`}>
                                {item.type}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground">{formatDate(item.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-normal capitalize ${
                            isPublished
                              ? 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                              : 'border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-950/40'
                          }`}
                        >
                          {item.status || 'Published'}
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </div>
        </Card>

        {/* Bottom Right: Platform Support & Tickets */}
        <Card className="border shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Platform Support & Tickets</CardTitle>
                  <p className="text-xs text-muted-foreground">User support requests & help tickets</p>
                </div>
              </div>
              <Link to="/app/support" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                Manage Support <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {supportTickets.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No support tickets pending.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {supportTickets.slice(0, 3).map((ticket) => {
                    const status = (ticket.status || 'open').toLowerCase();
                    let badgeClass = 'border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-950/40';
                    if (status === 'resolved' || status === 'closed') {
                      badgeClass = 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40';
                    } else if (status === 'in_progress' || status === 'replied') {
                      badgeClass = 'border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-950/40';
                    }

                    const senderName = ticket.user?.full_name || ticket.user?.name || ticket.name || 'User';
                    const senderEmail = ticket.user?.email || ticket.email || '';

                    return (
                      <Link
                        key={ticket.id}
                        to={`/app/support?ticket=${ticket.id}`}
                        className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold text-xs uppercase border border-rose-500/20">
                            {senderName ? senderName.charAt(0) : 'S'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{ticket.subject || 'Support Request'}</p>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              From <span className="font-medium text-foreground">{senderName}</span> {senderEmail ? `(${senderEmail})` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <Badge variant="outline" className={`text-[11px] font-medium capitalize ${badgeClass}`}>
                            {status.replace('_', ' ')}
                          </Badge>
                          <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3" /> {formatDate(ticket.created_at || ticket.createdAt)}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
