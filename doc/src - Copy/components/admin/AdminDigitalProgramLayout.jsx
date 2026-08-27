import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import DigitalProgramSidebar from "./DigitalProgramSidebar";

const sidebarItems = [
  { label: "Technology Readiness Assessment", href: "/app/digital-programs/technology-readiness-assessment" },
  { label: "Expert-Led Technology Training", href: "/app/digital-programs/expert-led-training" },
  { label: "Cloud Services", href: "/app/digital-programs/cloud-services" },
  { label: "Careers", href: "/app/digital-programs/careers" },

  { label: "Tech Career Pathways", href: "/app/digital-programs/tech-pathways" },

  { label: "Live Webinars", href: "/app/digital-programs/live-webinar" },
];


export default function AdminDigitalProgramLayout() {
  return (
    <div className="flex flex-col lg:flex-row gap-2 ">
      <div className="lg:w-64 w-full h-full">
        <DigitalProgramSidebar items={sidebarItems} matchStart />
      </div>


      <div className="flex-1 bg-background border border-border rounded-lg p-4 h-[80vh] ">
        <Outlet />
      </div>
    </div>
  );
}
