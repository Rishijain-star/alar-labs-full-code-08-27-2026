import React from "react";
import { Outlet } from "react-router-dom";
import DigitalProgramSidebar from "./DigitalProgramSidebar";

const sidebarItems = [
  { href: "/app/digital-programs/cloud-services", label: "Cloud Services" },
  { href: "/app/digital-programs/exam-topics", label: "Exam Topics" },
  { href: "/app/digital-programs/technology-readiness-assessment", label: "Technology Readiness Assessment" },
  { href: "/app/digital-programs/careers", label: "Tech Career Pathways" },
  { href: "/app/digital-programs/vouchers", label: "Exam Vouchers" },
];

export default function AdminDigitalProgramLayout() {
  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 p-2 lg:p-6 min-h-[calc(100vh-4rem)]">
      <aside className="w-full lg:w-64 flex-shrink-0">
        <DigitalProgramSidebar items={sidebarItems} matchStart={true} />
      </aside>
      <main className="flex-1 min-w-0 bg-background border border-border rounded-lg p-4 lg:p-6">
        <Outlet />
      </main>
    </div>
  );
}
