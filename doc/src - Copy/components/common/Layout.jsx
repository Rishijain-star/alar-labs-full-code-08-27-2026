import { Outlet, useLocation } from "react-router-dom"
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
    <div className="min-h-screen bg-gray-50 flex">

    
      <Sidebar />

      <div className="ml-0 lg:ml-[var(--sidebar-w,15rem)] flex-1 transition-[margin] duration-300">
        <AdminHeader title={title} />

        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>

    </div>
  )
}
