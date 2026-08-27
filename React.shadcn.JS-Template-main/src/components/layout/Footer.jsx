import { Link } from "react-router-dom";
import {
  Beaker,
  GraduationCap,
  Mail,
  Linkedin,
  Twitter,
  Youtube,
  Users,
  Award,
  Cloud,
  Briefcase,
  ClipboardCheck,
  Tag,
  ShieldCheck,
  HelpCircle,
  ArrowUpRight,
} from "lucide-react";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { usePlatformSettings } from "@/context/PlatformSettingsContext";

export function Footer() {
  const { siteName } = usePlatformSettings();

  return (
    <footer className="bg-slate-950 text-slate-200 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-slate-800/60">
          
          {/* Column 1: Brand Info */}
          <div className="lg:col-span-2 pr-0 lg:pr-6">
            <SiteLogo to="/" variant="footer" className="mb-4" imgClassName="ring-1 ring-slate-700/50" />
            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-sm">
              Empowering learners worldwide with hands-on cloud labs, expert-led training, role-based career pathways, and industry certifications.
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-2.5">
              <a
                href="#"
                aria-label="Twitter"
                className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-primary hover:border-primary transition-all duration-200 shadow-sm"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-primary hover:border-primary transition-all duration-200 shadow-sm"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="#"
                aria-label="YouTube"
                className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-600 hover:border-red-600 transition-all duration-200 shadow-sm"
              >
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Learning Programs */}
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
              Learning Solutions
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/training" className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-2 group">
                  <Users className="w-3.5 h-3.5 text-primary opacity-80 group-hover:opacity-100" />
                  Expert-Led Training
                </Link>
              </li>
              <li>
                <Link to="/labs" className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-2 group">
                  <Beaker className="w-3.5 h-3.5 text-emerald-400 opacity-80 group-hover:opacity-100" />
                  Hands-on Skill Labs
                </Link>
              </li>
              <li>
                <Link to="/courses" className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-2 group">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-400 opacity-80 group-hover:opacity-100" />
                  Courses &amp; Modules
                </Link>
              </li>
              <li>
                <Link to="/assessment" className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-2 group">
                  <ClipboardCheck className="w-3.5 h-3.5 text-amber-400 opacity-80 group-hover:opacity-100" />
                  Skill Assessment
                </Link>
              </li>
              <li>
                <Link to="/certification" className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-2 group">
                  <Award className="w-3.5 h-3.5 text-purple-400 opacity-80 group-hover:opacity-100" />
                  Certifications
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform Services */}
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block"></span>
              Career &amp; Services
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/cloud-services" className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-2 group">
                  <Cloud className="w-3.5 h-3.5 text-sky-400 opacity-80 group-hover:opacity-100" />
                  Cloud Services
                </Link>
              </li>
              <li>
                <Link to="/careers" className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-2 group">
                  <Briefcase className="w-3.5 h-3.5 text-orange-400 opacity-80 group-hover:opacity-100" />
                  Tech Career Pathways
                </Link>
              </li>
              <li>
                <Link to="/vouchers" className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-2 group">
                  <Tag className="w-3.5 h-3.5 text-rose-400 opacity-80 group-hover:opacity-100" />
                  Exam Vouchers
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Help */}
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span>
              Support &amp; Contact
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:hello@skillpath.com" className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>hello@skillpath.com</span>
                </a>
              </li>
              <li>
                <Link to="/support" className="text-slate-400 hover:text-white text-sm transition-colors flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  Help &amp; Documentation
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {siteName}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-6">
            <Link to="/privacy" className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-slate-300 transition-colors">
              Terms of Service
            </Link>
            <span className="flex items-center gap-1 text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Safe &amp; Secure Platform
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}