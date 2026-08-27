import { Link } from "react-router-dom";
import { Beaker, GraduationCap, Mail, Linkedin, Twitter, Youtube } from "lucide-react";
import { SiteLogo } from "@/components/branding/SiteLogo";

export function Footer() {
  return (
    <footer className="bg-foreground text-background border-t border-background/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <SiteLogo to="/" variant="footer" className="mb-3" imgClassName="ring-1 ring-background/10" />
            <p className="text-background/60 text-sm mb-4 leading-relaxed">
              Hands-on labs, course bundles, and Skill Builder paths — same look as the site header.
            </p>
            <div className="flex gap-2">
              <a href="#" className="w-8 h-8 rounded-lg bg-background/10 flex items-center justify-center hover:bg-primary transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-background/10 flex items-center justify-center hover:bg-primary transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 rounded-lg bg-background/10 flex items-center justify-center hover:bg-primary transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-background/90">Learn</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/labs" className="text-background/60 hover:text-background transition-colors text-sm inline-flex items-center gap-2">
                  <Beaker className="w-3.5 h-3.5 opacity-80" />
                  Labs
                </Link>
              </li>
              <li>
                <Link to="/courses" className="text-background/60 hover:text-background transition-colors text-sm inline-flex items-center gap-2">
                  <GraduationCap className="w-3.5 h-3.5 opacity-80" />
                  Courses
                </Link>
              </li>
             
              <li>
                <Link to="/training" className="text-background/60 hover:text-background transition-colors text-sm">
                  Training
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-background/60 hover:text-background transition-colors text-sm">
                  About
                </Link>
              </li>
              <li>
                <Link to="/careers" className="text-background/60 hover:text-background transition-colors text-sm">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-background/60 hover:text-background transition-colors text-sm">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-sm">Contact</h4>
            <div className="flex items-center gap-2 text-background/60 text-sm">
              <Mail className="w-4 h-4" />
              <span>hello@skillpath.com</span>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-background/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-background/40 text-xs">
            © {new Date().getFullYear()} ALAR Labs. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-background/40 hover:text-background transition-colors text-xs">
              Privacy
            </Link>
            <Link to="/terms" className="text-background/40 hover:text-background transition-colors text-xs">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}