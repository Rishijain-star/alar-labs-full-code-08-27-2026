// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/providers/ToastProvider";

import { ProtectedRoute, PublicRoute } from "@/components/ProtectedRoute";
import { RouteGuard } from "@/components/guards/RouteGuard";
import { SmartRedirect } from "@/components/guards/SmartRedirect";
import { AuthInitializer } from "@/components/AuthInitializer";
import UploadProgressBar from "@/components/global/UploadProgressBar";
import FloatingContactWidget from "@/components/global/FloatingContactWidget";
import { Loader2 } from "lucide-react";
import { SiteBrandingProvider } from "@/context/SiteBrandingContext";

const MainLayout = lazy(() => import("@/components/layout/MainLayout"));
const Layout = lazy(() => import("./components/common/Layout"));
const SkillBuilderLabCreate = lazy(() => import("./pages/admin/SkillBuilderPro"));
const SkillBuilderLabs = lazy(() => import("./pages/SkillBuilderLabs"));
const SkillBuilderLesson = lazy(() => import("./pages/SkillBuilderLesson"));
const Index = lazy(() => import("./pages/Index"));
const Labs = lazy(() => import("./pages/Labs"));
const LabDetail = lazy(() => import("./pages/LabDetail"));
const LabRun = lazy(() => import("./pages/LabRun"));
const GroupLabDetail = lazy(() => import("./pages/GroupLabDetail"));
const Courses = lazy(() => import("./pages/Courses"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const Training = lazy(() => import("./pages/Training"));
const Assessment = lazy(() => import("./pages/Assessment"));
const Certification = lazy(() => import("./pages/Certification"));
const CloudServices = lazy(() => import("./pages/CloudServices"));
const Careers = lazy(() => import("./pages/Careers"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const VerifyPhone = lazy(() => import("./pages/VerifyPhone"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const VerifyMfa = lazy(() => import("./pages/VerifyMFA"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUserCreate = lazy(() => import("./pages/admin/AdminUserCreate"));
const AdminCourses = lazy(() => import("./pages/admin/AdminCourses"));
const AdminLabs = lazy(() => import("./pages/admin/AdminLabs"));
const CourseCreate = lazy(() => import("./pages/admin/CourseCreate"));
const AdminLabCreate = lazy(() => import("./pages/admin/AdminLabCreate"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AdminAccessControl = lazy(() => import("./pages/admin/AdminAccessControl"));
const AdminCourseApproval = lazy(() => import("./pages/admin/AdminCourseApproval"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminBanners = lazy(() => import("./pages/admin/AdminBanners"));
const AdminContentHero = lazy(() => import("./pages/admin/AdminContentHero"));
const AdminContentLogo = lazy(() => import("./pages/admin/AdminContentLogo"));
const AdminContentTopbar = lazy(() => import("./pages/admin/AdminContentTopbar"));
const AdminCourseReview = lazy(() => import("./pages/admin/Admincoursereview"));
const AdminLabReview = lazy(() => import("./pages/admin/AdminLabReview"));
const NormalLearningLabCreate = lazy(() => import("./pages/admin/NormalLearningLabCreate"));
const AdminWebinarList = lazy(() => import("./pages/admin/AdminWebinarList"));
const AdminWebinarDetail = lazy(() => import("./pages/admin/Adminwebinardetail"));
const AdminWebinarCreate = lazy(() => import("./pages/admin/AdminWebinarCreate"));
const ChangePassword = lazy(() => import("./pages/ChangePasswords"));
const AdminDigitalProgramLayout = lazy(() => import("./components/admin/AdminDigitalProgramLayout"));
const TechnologyReadinessAssessmentAdmin = lazy(() => import("./pages/admin/settings/TechnologyReadinessAssessmentAdmin"));
const TechPathways = lazy(() => import("./pages/admin/settings/TechPathways"));

const General1 = lazy(() => import("./pages/admin/settings/General1"));
const CloudServicesAdmin = lazy(() => import("./pages/admin/settings/CloudServicesAdmin"));
const CareersAdmin = lazy(() => import("./pages/admin/settings/CareersAdmin"));
const AdminExpertLedTraining = lazy(() => import("./pages/admin/AdminExpertLedTraining"));
const SupportChatPage = lazy(() => import("./pages/SupportChatPage"));
const HomePageHighlights = lazy(() => import("./pages/admin/settings/HomePageHighlights"));
const SkillBuilderLabsAdmin = lazy(() => import("./pages/admin/settings/SkillBuilderLabsAdmin"));
const TechnicalLabManualAdmin = lazy(() => import("./pages/admin/settings/TechnicalLabManualAdmin"));
const ProgramPublicPage = lazy(() => import("./pages/ProgramPublicPage"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OverviewDetailsPage = lazy(() => import("./pages/OverviewDetilasPage"));
const LearningWorkspacePage = lazy(() => import("./pages/LearningWorkspacePage"));
const CourseOverviewPage = lazy(() => import("./pages/CourseOverviewPage"));
const CourseLearningPage = lazy(() => import("./pages/CourseLearningPage"));
const LearningProgressReportPage = lazy(() => import("./pages/LearningProgressReportPage"));
const MyLearning = lazy(() => import("./pages/MyLearning"));
const AdminEnrollments = lazy(() => import("./pages/admin/AdminEnrollments"));
const CreatorInsights = lazy(() => import("./pages/admin/CreatorInsights"));
const LegalPage = lazy(() => import("./pages/LegalPage"));

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
        <ToastProvider />

        <AuthInitializer>
          <BrowserRouter>
            <SiteBrandingProvider>
              <ScrollToTopOnRouteChange />
              <UploadProgressBar />
              <FloatingContactWidget />
              <Suspense fallback={<div className="grid place-items-center min-h-[60vh] text-muted-foreground">

                <div className="flex items-center justify-center min-h-screen">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground"></p>
                  </div>
                </div>
              </div>}>
                <Routes>
                  {/* ════════ PUBLIC ROUTES ════════ */}
                  <Route element={<MainLayout />}>
                    <Route path="/" element={<Index />} />
                    <Route path="/labs" element={<Labs />} />
                    <Route path="/change-password" element={<ChangePassword />} />
                    {/* Support slug-based lab overview */}
                    <Route path="/labs/:slug" element={<OverviewDetailsPage />} />

                    {/* Skill Builder Labs */}
                    <Route path="/skill-builder-labs" element={<SkillBuilderLabs />} />

                    <Route path="/skill-builder-labs/:labId/lessons/:lessonId" element={<SkillBuilderLesson />} />
                    <Route path="/learning/:labId" element={<LearningWorkspacePage />} />
                    <Route path="/learning/:labId/lessons/:lessonId" element={<LearningWorkspacePage />} />

                    <Route path="/skill-labs/:slug" element={<LabDetail />} />
                    <Route path="/labs/:slug/start" element={<LearningWorkspacePage />} />
                    <Route path="/labs/:slug/run" element={<LearningWorkspacePage />} />
                    <Route path="/group-labs/:id" element={<GroupLabDetail />} />
                    <Route path="/courses" element={<Courses />} />
                    <Route path="/courses/:slug" element={<CourseOverviewPage />} />
                    <Route path="/courses/:slug/learn" element={<CourseLearningPage />} />
                    <Route path="/courses/:slug/learn/complete" element={<LearningProgressReportPage />} />
                    <Route path="/labs/:slug/complete" element={<LearningProgressReportPage />} />
                    <Route path="/training" element={<Training />} />
                    <Route
                      path="/support/chat/:ticketId"
                      element={
                        <ProtectedRoute>
                          <SupportChatPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/assessment" element={<Assessment />} />
                    <Route path="/certification" element={<Certification />} />
                    <Route path="/cloud-services" element={<CloudServices />} />
                    <Route path="/careers" element={<Careers />} />
                    <Route path="/programs/:sectionKey" element={<ProgramPublicPage />} />
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

                  {/* Approval preview routes (no public header/footer) */}

                  <Route
                    path="/approval-preview/labs/:slug"
                    element={
                      <ProtectedRoute>
                        <RouteGuard permissions={['approve_courses', 'approve_labs', 'approve_own_courses', 'approve_own_labs', 'edit_labs', 'delete_labs']}>
                          <OverviewDetailsPage />
                        </RouteGuard>
                      </ProtectedRoute>
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
                      path="creator-insights"
                      element={
                        <RouteGuard permissions={['create_courses', 'create_labs']}>
                          <CreatorInsights />
                        </RouteGuard>
                      }
                    />

                    <Route
                      path="admin/enrollments"
                      element={
                        <RouteGuard permissions={['view_users']}>
                          <AdminEnrollments />
                        </RouteGuard>
                      }
                    />

                    {/* Users Management - Requires view_users permission */}
                    <Route
                      path="users"
                      element={
                        <RouteGuard permissions={['view_users']}>
                          <AdminUsers />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="users/new"
                      element={
                        <RouteGuard permissions={['create_users']}>
                          <AdminUserCreate />
                        </RouteGuard>
                      }
                    />

                    {/* Access Control - Requires manage_access_control permission */}
                    <Route
                      path="access-control"
                      element={
                        <RouteGuard permissions={['manage_access_control']}>
                          <AdminAccessControl />
                        </RouteGuard>
                      }
                    />

                    {/* Courses - Requires view_courses permission */}
                    <Route
                      path="courses/list"
                      element={
                        <RouteGuard permissions={['view_courses']}>
                          <AdminCourses />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="courses/new"
                      element={
                        <RouteGuard permissions={['create_courses']}>
                          <CourseCreate />
                        </RouteGuard>
                      }
                    />

                    {/* Labs - Requires view_labs permission */}
                    <Route
                      path="labs"
                      element={
                        <RouteGuard permissions={['view_labs']}>
                          <AdminLabs />
                        </RouteGuard>
                      }
                    />

                    <Route
                      path="labs/skill-builder-lab-new"
                      element={
                        <RouteGuard permissions={['create_labs']}>
                          <SkillBuilderLabCreate />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="labs/new"
                      element={
                        <RouteGuard permissions={['create_labs']}>
                          <NormalLearningLabCreate />
                        </RouteGuard>
                      }
                    />



                    {/* Digital Programs - Nested Layout with Protected Child Routes */}
                    <Route
                      path="digital-programs"
                      element={
                        <RouteGuard permissions={['manage_programs', 'view_programs']}>
                          <AdminDigitalProgramLayout />
                        </RouteGuard>
                      }
                    >
                      <Route index element={<Navigate to="technology-readiness-assessment" replace />} />
                      <Route path="general" element={<Navigate to="technology-readiness-assessment" replace />} />

                      <Route
                        path="technology-readiness-assessment"
                        element={
                          <RouteGuard permissions={['view_programs', 'manage_programs']}>
                            <TechnologyReadinessAssessmentAdmin />
                          </RouteGuard>
                        }
                      />

                      <Route
                        path="expert-led-training"
                        element={
                          <RouteGuard permissions={['view_programs', 'manage_programs']}>
                            <AdminExpertLedTraining />
                          </RouteGuard>
                        }
                      />

                      <Route
                        path="certification-readiness-program"
                        element={
                          <RouteGuard permissions={['view_programs', 'manage_programs']}>
                            <General1 />
                          </RouteGuard>
                        }
                      />

                      <Route
                        path="tech-pathways"
                        element={
                          <RouteGuard permissions={['view_programs', 'manage_programs']}>
                            <TechPathways />
                          </RouteGuard>
                        }
                      />

                      <Route
                        path="skill-builder-labs"
                        element={
                          <RouteGuard permissions={['view_programs', 'manage_programs']}>
                            <SkillBuilderLabsAdmin />
                          </RouteGuard>
                        }
                      />

                      <Route
                        path="cloud-services"
                        element={
                          <RouteGuard permissions={['view_programs', 'manage_programs']}>
                            <CloudServicesAdmin />
                          </RouteGuard>
                        }
                      />

                      <Route
                        path="careers"
                        element={
                          <RouteGuard permissions={['view_programs', 'manage_programs']}>
                            <CareersAdmin />
                          </RouteGuard>
                        }
                      />

                      <Route
                        path="home-page"
                        element={
                          <RouteGuard permissions={['view_programs', 'manage_programs']}>
                            <HomePageHighlights />
                          </RouteGuard>
                        }
                      />

                      <Route
                        path="technical-lab-manual"
                        element={
                          <RouteGuard permissions={['view_programs', 'manage_programs']}>
                            <TechnicalLabManualAdmin />
                          </RouteGuard>
                        }
                      />

                      <Route
                        path="live-webinar"
                        element={
                          <RouteGuard permissions={['view_webinars', 'create_webinars', 'edit_webinars', 'delete_webinars']}>
                            <AdminWebinarList />
                          </RouteGuard>
                        }
                      />

                      <Route
                        path="webinar/create"
                        element={
                          <RouteGuard permissions={['create_webinars']}>
                            <AdminWebinarCreate />
                          </RouteGuard>
                        }
                      />

                      <Route
                        path="webinar/:id"
                        element={
                          <RouteGuard permissions={['view_webinars', 'edit_webinars']}>
                            <AdminWebinarDetail />
                          </RouteGuard>
                        }
                      />


                    </Route>

                    {/* Content approval: global (approve_*) or own-content (approve_own_*) */}
                    <Route
                      path="course-approval"
                      element={
                        <RouteGuard
                          permissions={[
                            'approve_courses',
                            'approve_own_courses',
                            'approve_labs',
                            'approve_own_labs',
                          ]}
                        >
                          <AdminCourseApproval />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="courses/:courseSlug/review"
                      element={
                        <RouteGuard permissions={['approve_courses', 'approve_own_courses']}>
                          <AdminCourseReview />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="labs/:labId/review"
                      element={
                        <RouteGuard
                          permissions={[
                            'approve_courses',
                            'approve_labs',
                            'approve_own_courses',
                            'approve_own_labs',
                          ]}
                        >
                          <AdminLabReview />
                        </RouteGuard>
                      }
                    />

                    {/* Categories - Requires manage_categories permission */}
                    <Route
                      path="categories1"
                      element={
                        <RouteGuard permissions={['manage_categories']}>

                          <AdminCategories />
                        </RouteGuard>
                      }
                    />

                    <Route
                      path="categories"
                      element={
                        <RouteGuard permissions={['manage_categories']}>

                          <AdminCategories />
                        </RouteGuard>
                      }
                    />

                    {/* Banners - Requires manage_banners permission */}
                    <Route
                      path="banners"
                      element={
                        <RouteGuard permissions={['manage_banners']}>
                          <AdminBanners />
                        </RouteGuard>
                      }
                    />

                    {/* Settings - Requires view_settings permission */}
                    <Route
                      path="settings"
                      element={
                        <RouteGuard permissions={['view_settings']}>
                          <AdminSettings />
                        </RouteGuard>
                      }
                    />

                    {/* Support - Requires view_support permission */}
                    <Route
                      path="support"
                      element={
                        <RouteGuard permissions={['view_support']}>
                          <AdminSupport />
                        </RouteGuard>
                      }
                    />

                    {/* Content Management - Requires view_content or edit_content permission */}
                    <Route
                      path="content/hero"
                      element={
                        <RouteGuard permissions={['view_content', 'edit_content']}>
                          <AdminContentHero />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="content/logo"
                      element={
                        <RouteGuard permissions={['edit_content']}>
                          <AdminContentLogo />
                        </RouteGuard>
                      }
                    />
                    <Route
                      path="content/topbar"
                      element={
                        <RouteGuard permissions={['edit_content']}>
                          <AdminContentTopbar />
                        </RouteGuard>
                      }
                    />
                  </Route>

                  {/* ════════ LEGACY REDIRECTS ════════ */}
                  <Route path="/admin/*" element={<Navigate to="/app" replace />} />
                  <Route path="/user/*" element={<Navigate to="/app/dashboard" replace />} />

                  {/* ════════ ERROR PAGES ════════ */}
                  <Route path="/unauthorized" element={<Unauthorized />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </SiteBrandingProvider>
          </BrowserRouter>
        </AuthInitializer>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
