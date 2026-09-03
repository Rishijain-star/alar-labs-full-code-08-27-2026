/**
 * Permission bundles: one primary permission implies everything needed for that flow.
 * Used when assigning roles and when checking access (runtime expansion).
 */

const PERMISSION_IMPLIES = {
  // ── Courses ──
  view_courses: ["view_courses"],
  create_courses: [
    "create_courses",
    "publish_courses",
    "view_courses",
    "upload_files",
    "view_files",
    "view_categories",
    "create_categories",
  ],
  edit_courses: ["edit_courses", "view_courses", "upload_files", "view_files", "view_categories"],
  delete_courses: ["delete_courses", "view_courses"],
  publish_courses: ["publish_courses", "view_courses"],
  approve_courses: ["approve_courses", "view_courses"],
  approve_own_courses: ["approve_own_courses", "view_courses"],

  // ── Labs ──
  view_labs: ["view_labs"],
  create_labs: ["create_labs", "publish_labs", "view_labs", "upload_files", "view_files"],
  edit_labs: ["edit_labs", "view_labs", "upload_files", "view_files"],
  delete_labs: ["delete_labs", "view_labs"],
  publish_labs: ["publish_labs", "view_labs"],
  approve_labs: ["approve_labs", "view_labs"],
  approve_own_labs: ["approve_own_labs", "view_labs"],

  // ── Exam Topics ──
  view_exam_topics: ["view_exam_topics"],
  create_exam_topics: ["create_exam_topics", "publish_exam_topics", "view_exam_topics"],
  edit_exam_topics: ["edit_exam_topics", "view_exam_topics"],
  delete_exam_topics: ["delete_exam_topics", "view_exam_topics"],
  publish_exam_topics: ["publish_exam_topics", "view_exam_topics"],
  approve_exam_topics: ["approve_exam_topics", "view_exam_topics"],
  approve_own_exam_topics: ["approve_own_exam_topics", "view_exam_topics"],

  // ── Cloud Services & Career Offerings ──
  approve_cloud_services: ["approve_cloud_services", "view_cloud_services", "manage_cloud_services", "view_programs"],
  approve_career_offerings: ["approve_career_offerings", "view_career_offerings", "manage_career_offerings", "view_programs"],

  // ── Digital programs (webinars, cloud, careers, assessments) ──
  view_programs: [
    "view_programs",
    "view_webinars",
    "view_cloud_services",
    "view_career_offerings",
  ],
  create_programs: [
    "create_programs",
    "manage_programs",
    "view_programs",
    "view_webinars",
    "create_webinars",
    "edit_webinars",
    "upload_files",
    "view_files",
    "manage_cloud_services",
    "manage_career_offerings",
    "view_cloud_services",
    "view_career_offerings",
    "edit_programs",
  ],
  edit_programs: [
    "edit_programs",
    "edit_webinars",
    "manage_programs",
    "view_programs",
    "view_webinars",
    "upload_files",
    "view_files",
    "manage_cloud_services",
    "manage_career_offerings",
    "view_cloud_services",
    "view_career_offerings",
  ],
  delete_programs: [
    "delete_programs",
    "delete_webinars",
    "manage_programs",
    "view_programs",
    "view_webinars",
  ],

  // ── Users ──
  view_users: ["view_users"],
  create_users: ["create_users", "view_users"],
  edit_users: ["edit_users", "view_users", "manage_users"],
  delete_users: ["delete_users", "view_users"],
  manage_users: ["manage_users", "view_users", "edit_users"],

  // ── Categories ──
  view_categories: ["view_categories"],
  manage_categories: [
    "manage_categories",
    "view_categories",
    "create_categories",
    "edit_categories",
    "delete_categories",
  ],

  // ── Content & site ──
  view_content: ["view_content"],
  edit_content: ["edit_content", "view_content", "upload_files", "view_files"],
  manage_banners: ["manage_banners", "view_content", "edit_content", "upload_files"],

  // ── Certifications ──
  view_certifications: ["view_certifications", "view_certificates"],
  manage_certifications: [
    "manage_certifications",
    "manage_certificates",
    "view_certifications",
    "view_certificates",
    "generate_certificates",
  ],

  // ── Access control ──
  manage_access_control: [
    "manage_access_control",
    "view_roles",
    "create_roles",
    "edit_roles",
    "delete_roles",
    "view_permissions",
  ],

  // ── Settings & support ──
  view_settings: ["view_settings", "view_system_settings"],
  edit_settings: ["edit_settings", "manage_system_settings", "view_settings"],
  view_support: ["view_support"],
  manage_support: ["manage_support", "view_support"],

  // ── Enrollments & favorites ──
  manage_enrollments: ["manage_enrollments", "view_courses"],
  view_favorites: ["view_favorites"],
  manage_favorites: ["manage_favorites", "view_favorites"],
  view_all_payments: ["view_all_payments"],
  view_own_payments: ["view_own_payments"],
};

/** UI groups shown in Access Control role dialog */
const PERMISSION_BUNDLE_GROUPS = [
  {
    id: "create_permissions",
    label: "Create Permissions (Content & Entities)",
    bundles: [
      { id: "create_courses", label: "Create Course", description: "Create new courses and submit for approval" },
      { id: "create_labs", label: "Create Lab", description: "Create hands-on labs and lab steps" },
      { id: "create_programs", label: "Create Digital Program", description: "Create digital programs and learning tracks" },
      { id: "create_webinars", label: "Create Live Webinar", description: "Create and schedule live webinars" },
      { id: "create_expert_led_training", label: "Create Expert-Led Training", description: "Create expert-led training offerings" },
      { id: "create_cloud_services", label: "Create Cloud Service", description: "Create cloud environment offerings" },
      { id: "create_exam_topics", label: "Create Exam Topic", description: "Create exam topic sets and practice questions" },
      { id: "create_users", label: "Create User", description: "Add new user accounts" },
    ],
  },
  {
    id: "view_permissions",
    label: "View Permissions (Read-Only Access)",
    bundles: [
      { id: "view_courses", label: "View Courses", description: "Browse and open course lists and details" },
      { id: "view_labs", label: "View Labs", description: "Browse and open lab lists and details" },
      { id: "view_programs", label: "View Digital Programs", description: "View webinars, cloud services, and digital programs" },
      { id: "view_exam_topics", label: "View Exam Topics", description: "Browse exam topics and saved sets" },
      { id: "view_users", label: "All Users", description: "View all users list and profiles" },
      { id: "view_content", label: "View Site Content", description: "View site content sections and banners" },
      { id: "view_certifications", label: "View Certificates", description: "View certificate templates and issued certs" },
      { id: "view_settings", label: "View Settings", description: "Open platform settings in read-only mode" },
      { id: "view_support", label: "View Support", description: "View support tickets and messages" },
      { id: "view_favorites", label: "View Favorites", description: "Access favorites / wishlist items" },
    ],
  },
  {
    id: "payment_permissions",
    label: "Payment & Transaction History Access",
    bundles: [
      { id: "view_all_payments", label: "All Users' Payment History", description: "View payment, transaction, and order history for all users" },
      { id: "view_own_payments", label: "My Own Payment History", description: "View own payment, transaction, and order history" },
    ],
  },
  {
    id: "edit_permissions",
    label: "Edit Permissions (Modify Content)",
    bundles: [
      { id: "edit_courses", label: "Edit Course", description: "Edit existing courses and update content" },
      { id: "edit_labs", label: "Edit Lab", description: "Edit existing labs" },
      { id: "edit_programs", label: "Edit Digital Programs", description: "Edit existing digital program content" },
      { id: "edit_exam_topics", label: "Edit Exam Topics", description: "Edit existing learning sets and exams" },
      { id: "edit_users", label: "Edit Users", description: "Edit user accounts and roles" },
      { id: "edit_content", label: "Edit Site Content", description: "Edit logos, top bar, and site content" },
      { id: "edit_settings", label: "Edit Settings", description: "Change platform settings" },
    ],
  },
  {
    id: "approve_permissions",
    label: "Approve Permissions (Approval & Review)",
    bundles: [
      { id: "approve_cloud_services", label: "Approve Cloud Services", description: "Approve cloud services for publication" },
      { id: "approve_career_offerings", label: "Approve Tech Career Pathways", description: "Approve tech career pathways for publication" },
      { id: "approve_courses", label: "Approve All Courses", description: "Approve any course for publication" },
      { id: "approve_own_courses", label: "Approve Own Courses", description: "Approve only courses you created" },
      { id: "approve_labs", label: "Approve All Labs", description: "Approve any lab for publication" },
      { id: "approve_own_labs", label: "Approve Own Labs", description: "Approve only labs you created" },
      { id: "approve_exam_topics", label: "Approve All Exam Topics", description: "Approve any exam topic set for publication" },
      { id: "approve_own_exam_topics", label: "Approve Own Exam Topics", description: "Approve only exam topic sets you created" },
    ],
  },
  {
    id: "delete_permissions",
    label: "Delete Permissions (Remove Content)",
    bundles: [
      { id: "delete_courses", label: "Delete Course", description: "Permanently delete courses" },
      { id: "delete_labs", label: "Delete Lab", description: "Permanently delete labs" },
      { id: "delete_programs", label: "Delete Digital Programs", description: "Remove digital program entries" },
      { id: "delete_exam_topics", label: "Delete Exam Topics", description: "Delete learning sets and exams" },
      { id: "delete_users", label: "Delete Users", description: "Remove user accounts" },
    ],
  },
  {
    id: "publish_and_management",
    label: "Publish & System Management",
    bundles: [
      { id: "publish_courses", label: "Publish Courses", description: "Publish or unpublish courses" },
      { id: "publish_labs", label: "Publish Labs", description: "Publish or unpublish labs" },
      { id: "publish_exam_topics", label: "Publish Exam Topics", description: "Submit exam topics for publication" },
      { id: "manage_banners", label: "Manage Banners", description: "Create and manage homepage banners" },
      { id: "manage_categories", label: "Manage Categories", description: "Full category management for courses" },
      { id: "manage_certifications", label: "Manage Certificates", description: "Create and manage certification programs" },
      { id: "manage_access_control", label: "Access Control", description: "Manage roles and permissions" },
      { id: "manage_enrollments", label: "Manage Enrollments", description: "View and manage course enrollments" },
      { id: "manage_support", label: "Manage Support", description: "Reply to and manage support requests" },
      { id: "manage_favorites", label: "Manage Favorites", description: "Add and remove favorites" },
    ],
  },
];

const ALL_BUNDLE_IDS = new Set(
  PERMISSION_BUNDLE_GROUPS.flatMap((g) => g.bundles.map((b) => b.id))
);

function expandImpliedPermissions(permissionIds) {
  const set = new Set(permissionIds || []);
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...set]) {
      const implied = PERMISSION_IMPLIES[id];
      if (!implied) continue;
      for (const p of implied) {
        if (!set.has(p)) {
          set.add(p);
          changed = true;
        }
      }
    }
  }
  return [...set];
}

/** Detect active bundle toggles from stored permission ids (supports legacy granular assignments). */
function bundlesFromAssignedPermissions(assignedIds = []) {
  const set = new Set(assignedIds);
  const candidates = [];
  for (const group of PERMISSION_BUNDLE_GROUPS) {
    for (const bundle of group.bundles) {
      if (set.has(bundle.id)) {
        candidates.push(bundle.id);
        continue;
      }
      const implied = PERMISSION_IMPLIES[bundle.id];
      if (implied && implied.length > 0 && implied.every((p) => set.has(p))) {
        candidates.push(bundle.id);
      }
    }
  }

  const impliedByOthers = new Set();
  for (const candidateId of candidates) {
    const implied = PERMISSION_IMPLIES[candidateId];
    if (implied) {
      for (const perm of implied) {
        if (perm !== candidateId) {
          impliedByOthers.add(perm);
        }
      }
    }
  }

  const result = candidates.filter((id) => !impliedByOthers.has(id));
  return [...new Set(result)];
}

function expandBundlesForSave(selectedBundleIds) {
  return expandImpliedPermissions(selectedBundleIds);
}

/** Permissions not covered by any bundle — shown under Advanced in UI */
function getAdvancedPermissions(allPermissions, selectedBundleIds) {
  const expandedFromBundles = new Set(expandBundlesForSave(selectedBundleIds));
  return allPermissions.filter((p) => {
    if (ALL_BUNDLE_IDS.has(p.id)) return false;
    if (expandedFromBundles.has(p.id)) return false;
    return true;
  });
}

module.exports = {
  PERMISSION_IMPLIES,
  PERMISSION_BUNDLE_GROUPS,
  ALL_BUNDLE_IDS,
  expandImpliedPermissions,
  bundlesFromAssignedPermissions,
  expandBundlesForSave,
  getAdvancedPermissions,
};
