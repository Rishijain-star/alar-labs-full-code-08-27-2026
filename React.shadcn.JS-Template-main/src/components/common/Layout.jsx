import { Link, Outlet, useLocation } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import Sidebar from "./Sidebar"
import AdminHeader from "./Header"

const pageTitles = {
  "/admin/dashboard": "Dashboard",
  "/admin/users": "Users",
  "/admin/access-control": "Access Control",
  "/admin/courses": "Courses",
  "/admin/courses/new": "Create Course",
  "/admin/labs": "Labs",
  "/admin/digital-programs": "Digital Programs",
  "/admin/settings": "Settings",
}

export default function Layout() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || "Admin"

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="ml-0 min-w-0 flex-1 transition-[margin] duration-300 lg:ml-[var(--sidebar-w,15rem)]">
          <AdminHeader title={title} />

          <div className="border-b border-gray-100 bg-white px-4 md:px-6 py-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Site
            </Link>
          </div>

          <main className="p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
