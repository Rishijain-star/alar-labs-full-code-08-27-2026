// src/App.jsx
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/providers/ToastProvider";
import { ConfirmDialogProvider } from "@/providers/ConfirmDialogProvider";

import { ProtectedRoute, PublicRoute } from "@/components/ProtectedRoute";
import { RouteGuard } from "@/components/guards/RouteGuard";
import { SETTINGS_PAGE_PERMISSIONS } from "@/lib/settingsPermissions";
import { DIGITAL_PROGRAMS_ADMIN_PERMISSIONS } from "@/lib/digitalProgramsPermissions";
import { EXAM_TOPICS_ADMIN_PERMISSIONS } from "@/lib/examTopicsPermissions";
import {
  SmartRedirect,
  CoursesListRedirect,
  LabsListRedirect,
} from "@/components/guards/SmartRedirect";
import { AuthInitializer } from "@/components/AuthInitializer";
import SessionIdleManager from "@/components/SessionIdleManager";
import UploadProgressBar from "@/components/global/UploadProgressBar";
import FloatingContactWidget from "@/components/global/FloatingContactWidget";
import { Loader2 } from "lucide-react";
import { SiteBrandingProvider } from "@/context/SiteBrandingContext";
import { PlatformSettingsProvider } from "@/context/PlatformSettingsContext";

const MainLayout = lazy(() => import("@/components/layout/MainLayout"));
const Layout = lazy(() => import("./components/common/Layout"));
const SkillBuilderLabCreate = lazy(
  () => import("./pages/admin/SkillBuilderPro"),
);

const Index = lazy(() => import("./pages/Index"));
const Labs = lazy(() => import("./pages/Labs"));
const Courses = lazy(() => import("./pages/Courses"));

const Training = lazy(() => import("./pages/Training"));
const WebinarDetailPage = lazy(() => import("./pages/WebinarDetailPage"));
const ExpertTrainingProgramDetailPage = lazy(
  () => import("./pages/ExpertTrainingProgramDetailPage"),
);
const Assessment = lazy(() => import("./pages/Assessment"));
const ExamTopicsPage = lazy(() => import("./pages/ExamTopicsPage"));
const Certification = lazy(() => import("./pages/Certification"));
const CertificationDetail = lazy(() => import("./pages/CertificationDetail"));
const CloudServices = lazy(() => import("./pages/CloudServices"));
const CloudServiceDetailPage = lazy(() => import("./pages/CloudServiceDetailPage"));
const Careers = lazy(() => import("./pages/Careers"));
const CareerDetailPage = lazy(() => import("./pages/CareerDetailPage"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const VerifyPhone = lazy(() => import("./pages/VerifyPhone"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const VerifyMfa = lazy(() => import("./pages/VerifyMFA"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUserDetails = lazy(() => import("./pages/admin/AdminUserDetails"));
const AdminUserCreate = lazy(() => import("./pages/admin/AdminUserCreate"));
const AdminCourses = lazy(() => import("./pages/admin/AdminCourses"));
const AdminLabs = lazy(() => import("./pages/admin/AdminLabs"));
const CourseCreate = lazy(() => import("./pages/admin/CourseCreate"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AdminAccessControl = lazy(
  () => import("./pages/admin/AdminAccessControl"),
);
const AdminCourseApproval = lazy(
  () => import("./pages/admin/AdminCourseApproval"),
);
const AdminCertifications = lazy(
  () => import("./pages/admin/AdminCertifications"),
);
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminBanners = lazy(() => import("./pages/admin/AdminBanners"));
const AdminInstructorResources = lazy(() => import("./pages/admin/AdminInstructorResources"));
const AdminContentHero = lazy(() => import("./pages/admin/AdminContentHero"));
const AdminContentLogo = lazy(() => import("./pages/admin/AdminContentLogo"));
const AdminContentTopbar = lazy(
  () => import("./pages/admin/AdminContentTopbar"),
);
const AdminCourseReview = lazy(() => import("./pages/admin/Admincoursereview"));
const AdminLabReview = lazy(() => import("./pages/admin/AdminLabReview"));
const NormalLearningLabCreate = lazy(
  () => import("./pages/admin/NormalLearningLabCreate"),
);
const AdminWebinarList = lazy(() => import("./pages/admin/AdminWebinarList"));
const AdminWebinarDetail = lazy(
  () => import("./pages/admin/Adminwebinardetail"),
);
const AdminWebinarCreate = lazy(
  () => import("./pages/admin/AdminWebinarCreate"),
);
const ChangePassword = lazy(() => import("./pages/ChangePasswords"));
const AccountSettings = lazy(() => import("./pages/account/AccountSettings"));
const MyPaymentHistory = lazy(() => import("./pages/account/MyPaymentHistory"));
const HelpSupport = lazy(() => import("./pages/account/HelpSupport"));
const MFASettings = lazy(() => import("./pages/admin/MFAsettings"));
const AdminDigitalProgramLayout = lazy(
  () => import("./components/admin/AdminDigitalProgramLayout"),
);
const TechnologyReadinessAssessmentAdmin = lazy(
  () => import("./pages/admin/settings/TechnologyReadinessAssessmentAdmin"),
);
const ExamTopicsAdmin = lazy(
  () => import("./pages/admin/settings/ExamTopicsAdmin"),
);
const TechPathways = lazy(() => import("./pages/admin/settings/TechPathways"));

const General1 = lazy(() => import("./pages/admin/settings/General1"));
const CloudServicesAdmin = lazy(
  () => import("./pages/admin/settings/CloudServicesAdmin"),
);
const CareersAdmin = lazy(() => import("./pages/admin/settings/CareersAdmin"));
const AdminExpertLedTraining = lazy(
  () => import("./pages/admin/AdminExpertLedTraining"),
);
const AdminExpertTrainingProgramDetail = lazy(
  () => import("./pages/admin/AdminExpertTrainingProgramDetail"),
);
const SupportChatPage = lazy(() => import("./pages/SupportChatPage"));
const HomePageHighlights = lazy(
  () => import("./pages/admin/settings/HomePageHighlights"),
);
const SkillBuilderLabsAdmin = lazy(
  () => import("./pages/admin/settings/SkillBuilderLabsAdmin"),
);
const TechnicalLabManualAdmin = lazy(
  () => import("./pages/admin/settings/TechnicalLabManualAdmin"),
);
const ProgramPublicPage = lazy(() => import("./pages/ProgramPublicPage"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OverviewDetailsPage = lazy(() => import("./pages/OverviewDetilasPage"));
const LearningWorkspacePage = lazy(
  () => import("./pages/LearningWorkspacePage"),
);
const CourseOverviewPage = lazy(() => import("./pages/CourseOverviewPage"));
const CourseLearningPage = lazy(() => import("./pages/CourseLearningPage"));
const VouchersPage = lazy(() => import("./pages/Vouchers"));
const MyVouchersPage = lazy(() => import("./pages/MyVouchers"));
const VouchersCreate = lazy(() => import("./pages/admin/settings/VouchersCreate"));
const LearningProgressReportPage = lazy(
  () => import("./pages/LearningProgressReportPage"),
);
const MyLearning = lazy(() => import("./pages/MyLearning"));
const MyLabs = lazy(() => import("./pages/MyLabs"));
const MyPrograms = lazy(() => import("./pages/MyPrograms"));
const FavoritesPage = lazy(() => import("./pages/Favorites"));
const AdminEnrollments = lazy(() => import("./pages/admin/AdminEnrollments"));
const CreatorInsights = lazy(() => import("./pages/admin/CreatorInsights"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const InstructorResourcesList = lazy(() => import("./pages/InstructorResourcesList"));

const queryClient = new QueryClient();

function ScrollToTopOnRouteChange() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [pathname, search]);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ConfirmDialogProvider>
          <ToastProvider />

          <BrowserRouter>
            <AuthInitializer>
              <SessionIdleManager />
              <SiteBrandingProvider>
                <PlatformSettingsProvider>
                  <ScrollToTopOnRouteChange />
                  <UploadProgressBar />
                  <FloatingContactWidget />
                  <Suspense
                    fallback={
                      <div className="grid min-h-[60vh] place-items-center text-muted-foreground">
                        <div className="flex min-h-screen items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground"></p>
                          </div>
                        </div>
                      </div>
                    }
                  >
                    <Routes>
                      {/* ════════ PUBLIC ROUTES ════════ */}
                      <Route element={<MainLayout />}>
                        <Route path="/" element={<Index />} />
                        <Route path="/labs" element={<Labs />} />
                        <Route
                          path="/change-password"
                          element={<Navigate to="/app/account/change-password" replace />}
                        />
                        {/* Support slug-based lab overview */}
                        <Route
                          path="/labs/:slug"
                          element={<OverviewDetailsPage />}
                        />
                        <Route
                          path="/labs/:slug/start"
                          element={<LearningWorkspacePage />}
                        />
                        <Route
                          path="/labs/:slug/run"
                          element={<LearningWorkspacePage />}
                        />

                        <Route path="/courses" element={<Courses />} />
                        <Route
                          path="/courses/:slug"
                          element={<CourseOverviewPage />}
                        />
                        <Route
                          path="/courses/:slug/learn"
                          element={<CourseLearningPage />}
                        />
                        <Route
                          path="/courses/:slug/learn/complete"
                          element={<LearningProgressReportPage />}
                        />
                        <Route
                          path="/labs/:slug/complete"
                          element={<LearningProgressReportPage />}
                        />
                        <Route path="/training" element={<Training />} />
                        <Route
                          path="/training/webinar/:slug"
                          element={<WebinarDetailPage />}
                        />
                        <Route
                          path="/training/program/:slug"
                          element={<ExpertTrainingProgramDetailPage />}
                        />
                        <Route
                          path="/support/chat/:ticketId"
                          element={
                            <ProtectedRoute>
                              <SupportChatPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="/assessment" element={<Assessment />} />
                        <Route path="/exam-topics" element={<ExamTopicsPage />} />
                        <Route path="/vouchers" element={<VouchersPage />} />
                        <Route
                          path="/certification"
                          element={<Certification />}
                        />
                        <Route
                          path="/certification/:id"
                          element={<CertificationDetail />}
                        />
                        <Route
                          path="/cloud-services"
                          element={<CloudServices />}
                        />
                        <Route
                          path="/cloud-services/:id"
                          element={<CloudServiceDetailPage />}
                        />
                        <Route path="/careers" element={<Careers />} />
                        <Route path="/careers/:id" element={<CareerDetailPage />} />
                        <Route
                          path="/programs/:sectionKey"
                          element={<ProgramPublicPage />}
                        />
                        <Route path="/terms" element={<LegalPage />} />
                        <Route path="/privacy" element={<LegalPage />} />
                      </Route>

                      {/* ════════ AUTH ROUTES (redirect to /app if logged in) ════════ */}
                      <Route
                        path="/auth/login"
                        element={
                          <PublicRoute>
                            <Login />
                          </PublicRoute>
                        }
                      />
                      <Route
                        path="/auth/verify-mfa"
                        element={
                          <PublicRoute>
                            <VerifyMfa />
                          </PublicRoute>
                        }
                      />
                      <Route
                        path="/auth/register"
                        element={
                          <PublicRoute>
                            <Register />
                          </PublicRoute>
                        }
                      />
                      <Route
                        path="/auth/verify-phone"
                        element={
                          <PublicRoute>
                            <VerifyPhone />
                          </PublicRoute>
                        }
                      />
                      <Route
                        path="/auth/forgot-password"
                        element={
                          <PublicRoute>
                            <ForgotPassword />
                          </PublicRoute>
                        }
                      />

                      {/* ════════ PROTECTED /app ROUTES ════════
                  Strategy:
                  1. ProtectedRoute ensures user is authenticated
                  2. Layout provides the sidebar/header (sidebar auto-filters by permissions from localStorage)
                  3. RouteGuard on each page checks if user has required permissions
                  
                  Two layers of protection:
                  - Authentication check (ProtectedRoute)
                  - Authorization check (RouteGuard with permissions)
              */}
                      <Route
                        path="/app"
                        element={
                          <ProtectedRoute>
                            <Layout />
                          </ProtectedRoute>
                        }
                      >
                        {/* Redirect /app to dashboard */}
                        <Route index element={<SmartRedirect />} />

                        {/* Dashboard - Accessible to all authenticated users (no permissions required) */}
                        <Route
                          path="dashboard"
                          element={
                            <RouteGuard permissions={[]}>
                              <AdminDashboard />
                            </RouteGuard>
                          }
                        />

                        <Route
                          path="my-learning"
                          element={
                            <RouteGuard permissions={[]}>
                              <MyLearning />
                            </RouteGuard>
                          }
                        />

                        <Route
                          path="my-labs"
                          element={
                            <RouteGuard permissions={[]}>
                              <MyLabs />
                            </RouteGuard>
                          }
                        />

                        <Route
                          path="my-programs"
                          element={
                            <RouteGuard permissions={[]}>
                              <MyPrograms />
                            </RouteGuard>
                          }
                        />

                        <Route
                          path="my-vouchers"
                          element={
                            <RouteGuard permissions={[]}>
                              <MyVouchersPage />
                            </RouteGuard>
                          }
                        />

                        <Route
                          path="favorites"
                          element={
                            <RouteGuard permissions={["view_favorites"]}>
                              <FavoritesPage />
                            </RouteGuard>
                          }
                        />

                        {/* Trainer / User Instructor Resources */}
                        <Route
                          path="instructor-resources"
                          element={
                            <RouteGuard permissions={[]}>
                              <InstructorResourcesList />
                            </RouteGuard>
                          }
                        />

                        {/* Account — all authenticated users */}
                        <Route
                          path="account/settings"
                          element={
                            <RouteGuard permissions={[]}>
                              <AccountSettings />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="account/change-password"
                          element={
                            <RouteGuard permissions={[]}>
                              <ChangePassword />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="account/security"
                          element={
                            <RouteGuard permissions={[]}>
                              <MFASettings />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="account/help"
                          element={
                            <RouteGuard permissions={[]}>
                              <HelpSupport />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="payment-history"
                          element={
                            <RouteGuard permissions={[]}>
                              <MyPaymentHistory />
                            </RouteGuard>
                          }
                        />

                        <Route
                          path="creator-insights"
                          element={
                            <RouteGuard
                              permissions={["create_courses", "create_labs"]}
                            >
                              <CreatorInsights />
                            </RouteGuard>
                          }
                        />

                        <Route
                          path="admin/enrollments"
                          element={
                            <RouteGuard permissions={["view_users"]}>
                              <AdminEnrollments />
                            </RouteGuard>
                          }
                        />

                        <Route
                          path="vouchers"
                          element={
                            <Navigate to="/app/digital-programs/vouchers" replace />
                          }
                        />

                        {/* Users Management - Requires view_users permission */}
                        <Route
                          path="users"
                          element={
                            <RouteGuard permissions={["view_users"]}>
                              <AdminUsers />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="users/new"
                          element={
                            <RouteGuard permissions={["create_users"]}>
                              <AdminUserCreate />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="users/:userId/details"
                          element={
                            <RouteGuard permissions={["view_users"]}>
                              <AdminUserDetails />
                            </RouteGuard>
                          }
                        />

                        {/* Access Control - Requires manage_access_control permission */}
                        <Route
                          path="access-control"
                          element={
                            <RouteGuard permissions={["manage_access_control"]}>
                              <AdminAccessControl />
                            </RouteGuard>
                          }
                        />

                        {/* Courses - Requires view_courses permission */}
                        <Route
                          path="courses/catalog"
                          element={
                            <RouteGuard permissions={[]}>
                              <Courses />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="courses/:slug"
                          element={
                            <RouteGuard permissions={[]}>
                              <CourseOverviewPage />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="courses/:slug/learn"
                          element={
                            <RouteGuard permissions={[]}>
                              <CourseLearningPage />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="courses/:slug/learn/complete"
                          element={
                            <RouteGuard permissions={[]}>
                              <LearningProgressReportPage />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="courses/mine"
                          element={
                            <RouteGuard permissions={["view_courses"]}>
                              <AdminCourses />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="courses/others"
                          element={
                            <RouteGuard permissions={["view_courses"]}>
                              <AdminCourses />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="courses/list"
                          element={<CoursesListRedirect />}
                        />
                        <Route
                          path="courses/new"
                          element={
                            <RouteGuard permissions={["create_courses"]}>
                              <CourseCreate />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="courses/edit/:slug"
                          element={
                            <RouteGuard permissions={["edit_courses"]}>
                              <CourseCreate />
                            </RouteGuard>
                          }
                        />

                        {/* Labs - Requires view_labs permission */}
                        <Route
                          path="labs/catalog"
                          element={
                            <RouteGuard permissions={[]}>
                              <Labs />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="labs/:slug"
                          element={
                            <RouteGuard permissions={[]}>
                              <OverviewDetailsPage />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="labs/:slug/start"
                          element={
                            <RouteGuard permissions={[]}>
                              <LearningWorkspacePage />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="labs/:slug/run"
                          element={
                            <RouteGuard permissions={[]}>
                              <LearningWorkspacePage />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="labs/:slug/complete"
                          element={
                            <RouteGuard permissions={[]}>
                              <LearningProgressReportPage />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="labs/mine"
                          element={
                            <RouteGuard permissions={["view_labs"]}>
                              <AdminLabs />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="labs/others"
                          element={
                            <RouteGuard permissions={["view_labs"]}>
                              <AdminLabs />
                            </RouteGuard>
                          }
                        />
                        <Route path="labs" element={<LabsListRedirect />} />

                        <Route
                          path="labs/skill-builder-lab-new"
                          element={
                            <RouteGuard permissions={["create_labs"]}>
                              <SkillBuilderLabCreate />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="labs/skill-builder-lab-edit/:slug"
                          element={
                            <RouteGuard permissions={["edit_labs"]}>
                              <SkillBuilderLabCreate />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="labs/new"
                          element={
                            <RouteGuard permissions={["create_labs"]}>
                              <NormalLearningLabCreate />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="labs/edit/:slug"
                          element={
                            <RouteGuard permissions={["edit_labs"]}>
                              <NormalLearningLabCreate />
                            </RouteGuard>
                          }
                        />

                        {/* Certificate templates */}
                        <Route
                          path="certificates"
                          element={
                            <RouteGuard
                              permissions={[
                                "view_certifications",
                                "view_certificates",
                                "manage_certificates",
                                "manage_certifications",
                              ]}
                            >
                              <AdminCertifications />
                            </RouteGuard>
                          }
                        />

                        {/* Instructor Resources */}
                        <Route
                          path="admin/instructor-resources"
                          element={
                            <RouteGuard permissions={["manage_courses"]}>
                              <AdminInstructorResources />
                            </RouteGuard>
                          }
                        />

                        {/* Expert-Led Technology - Standalone Admin Route */}
                        <Route
                          path="expert-led-training"
                          element={
                            <RouteGuard permissions={[]}>
                              <AdminExpertLedTraining />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="expert-led-training/:id"
                          element={
                            <RouteGuard permissions={[]}>
                              <AdminExpertTrainingProgramDetail />
                            </RouteGuard>
                          }
                        />

                        {/* Live Webinars - Standalone Route */}
                        <Route
                          path="live-webinar"
                          element={
                            <RouteGuard permissions={[]}>
                              <AdminWebinarList />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="webinar/create"
                          element={
                            <RouteGuard
                              permissions={DIGITAL_PROGRAMS_ADMIN_PERMISSIONS}
                              adminOnlyDigitalPrograms
                            >
                              <AdminWebinarCreate />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="webinar/:id"
                          element={
                            <RouteGuard permissions={[]}>
                              <AdminWebinarDetail />
                            </RouteGuard>
                          }
                        />

                        {/* Digital Programs - Nested Layout with Protected Child Routes */}
                        <Route
                          path="digital-programs"
                          element={
                            <RouteGuard permissions={[]}>
                              <AdminDigitalProgramLayout />
                            </RouteGuard>
                          }
                        >
                          <Route
                            index
                            element={
                              <Navigate
                                to="cloud-services"
                                replace
                              />
                            }
                          />
                          <Route
                            path="general"
                            element={
                              <Navigate
                                to="cloud-services"
                                replace
                              />
                            }
                          />

                          <Route
                            path="expert-led-training"
                            element={
                              <Navigate
                                to="/app/expert-led-training"
                                replace
                              />
                            }
                          />
                          <Route
                            path="expert-led-training/:id"
                            element={
                              <Navigate
                                to="/app/expert-led-training"
                                replace
                              />
                            }
                          />

                          <Route
                            path="technology-readiness-assessment"
                            element={
                              <RouteGuard permissions={[]}>
                                <TechnologyReadinessAssessmentAdmin />
                              </RouteGuard>
                            }
                          />

                          <Route
                            path="certification-readiness-program"
                            element={
                              <RouteGuard permissions={[]}>
                                <General1 />
                              </RouteGuard>
                            }
                          />

                          <Route
                            path="tech-pathways"
                            element={
                              <RouteGuard permissions={[]}>
                                <TechPathways />
                              </RouteGuard>
                            }
                          />

                          <Route
                            path="skill-builder-labs"
                            element={
                              <RouteGuard permissions={[]}>
                                <SkillBuilderLabsAdmin />
                              </RouteGuard>
                            }
                          />

                          <Route
                            path="cloud-services"
                            element={
                              <RouteGuard permissions={[]}>
                                <CloudServicesAdmin />
                              </RouteGuard>
                            }
                          />

                          <Route
                            path="careers"
                            element={
                              <RouteGuard permissions={[]}>
                                <CareersAdmin />
                              </RouteGuard>
                            }
                          />

                          <Route
                            path="vouchers"
                            element={
                              <RouteGuard permissions={[]}>
                                <VouchersCreate />
                              </RouteGuard>
                            }
                          />

                          <Route
                            path="home-page"
                            element={
                              <RouteGuard
                                permissions={DIGITAL_PROGRAMS_ADMIN_PERMISSIONS}
                                adminOnlyDigitalPrograms
                              >
                                <HomePageHighlights />
                              </RouteGuard>
                            }
                          />

                          <Route
                            path="technical-lab-manual"
                            element={
                              <RouteGuard
                                permissions={DIGITAL_PROGRAMS_ADMIN_PERMISSIONS}
                                adminOnlyDigitalPrograms
                              >
                                <TechnicalLabManualAdmin />
                              </RouteGuard>
                            }
                          />

                          <Route
                            path="live-webinar"
                            element={
                              <Navigate to="/app/live-webinar" replace />
                            }
                          />

                          <Route
                            path="exam-topics"
                            element={
                              <RouteGuard permissions={[]}>
                                <ExamTopicsAdmin />
                              </RouteGuard>
                            }
                          />

                          <Route
                            path="webinar/create"
                            element={
                              <Navigate to="/app/webinar/create" replace />
                            }
                          />

                          <Route
                            path="webinar/:id"
                            element={
                              <Navigate to="/app/live-webinar" replace />
                            }
                          />
                        </Route>

                        {/* Content approval: global (approve_*) or own-content (approve_own_*) */}
                        <Route
                          path="course-approval"
                          element={
                            <RouteGuard
                              permissions={[
                                "approve_courses",
                                "approve_own_courses",
                                "approve_labs",
                                "approve_own_labs",
                                "approve_exam_topics",
                                "approve_own_exam_topics",
                              ]}
                            >
                              <AdminCourseApproval />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="courses/:courseSlug/review"
                          element={
                            <RouteGuard
                              permissions={[
                                "approve_courses",
                                "approve_own_courses",
                              ]}
                            >
                              <AdminCourseReview />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="labs/:labSlug/review"
                          element={
                            <RouteGuard
                              permissions={[
                                "approve_courses",
                                "approve_labs",
                                "approve_own_courses",
                                "approve_own_labs",
                              ]}
                            >
                              <AdminLabReview />
                            </RouteGuard>
                          }
                        />

                        <Route
                          path="categories"
                          element={
                            <RouteGuard permissions={["manage_categories"]}>
                              <AdminCategories />
                            </RouteGuard>
                          }
                        />

                        {/* Banners - Requires manage_banners permission */}
                        <Route
                          path="banners"
                          element={
                            <RouteGuard permissions={["manage_banners"]}>
                              <AdminBanners />
                            </RouteGuard>
                          }
                        />

                        {/* Settings - Requires view_settings permission */}
                        <Route
                          path="settings"
                          element={
                            <RouteGuard permissions={SETTINGS_PAGE_PERMISSIONS}>
                              <AdminSettings />
                            </RouteGuard>
                          }
                        />

                        {/* Support - Requires view_support permission */}
                        <Route
                          path="support"
                          element={
                            <RouteGuard permissions={["view_support"]}>
                              <AdminSupport />
                            </RouteGuard>
                          }
                        />

                        {/* Content Management - Requires view_content or edit_content permission */}
                        <Route
                          path="content/hero"
                          element={
                            <RouteGuard
                              permissions={["view_content", "edit_content"]}
                            >
                              <AdminContentHero />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="content/logo"
                          element={
                            <RouteGuard permissions={["edit_content"]}>
                              <AdminContentLogo />
                            </RouteGuard>
                          }
                        />
                        <Route
                          path="content/topbar"
                          element={
                            <RouteGuard permissions={["edit_content"]}>
                              <AdminContentTopbar />
                            </RouteGuard>
                          }
                        />
                      </Route>

                      {/* ════════ LEGACY REDIRECTS ════════ */}
                      <Route
                        path="/admin/*"
                        element={<Navigate to="/app" replace />}
                      />
                      <Route
                        path="/user/*"
                        element={<Navigate to="/app/dashboard" replace />}
                      />

                      {/* ════════ ERROR PAGES ════════ */}
                      <Route path="/unauthorized" element={<Unauthorized />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </PlatformSettingsProvider>
              </SiteBrandingProvider>
            </AuthInitializer>
          </BrowserRouter>
        </ConfirmDialogProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
