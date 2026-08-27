import React from "react";
import { Link } from "react-router-dom";
import { SiteLogo } from "@/components/branding/SiteLogo";

export function AuthLayout({ children, image }) {
    return (
        <div className="min-h-screen grid lg:grid-cols-2">
          
            <div className="hidden lg:block relative bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src={image || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800"}
                        alt="Authentication"
                        className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent" />
                </div>

                <div className="relative z-10 h-full flex flex-col justify-between p-12 text-white mb-8">
                    <SiteLogo
                        to="/"
                        variant="inverse"
                        className="text-white mb-8"
                        aria-label="Go to home"
                    />

                    <div className="text-white">
                        <h2 className="text-4xl font-bold mb-4 leading-tight">
                            Master Real-World<br />Tech Skills
                        </h2>
                        <p className="text-slate-300 text-lg max-w-md">
                            Industry-leading hands-on labs, expert-led training, and certification programs to accelerate your tech career.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-md">
                    <SiteLogo to="/" variant="compact" className="flex lg:hidden mb-8" showTagline={false} />

                    {React.Children.toArray(children)}
                </div>
            </div>
        </div>
    );
}