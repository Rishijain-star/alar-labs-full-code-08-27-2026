import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Home, ArrowLeft } from "lucide-react";

export default function Unauthorized() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="max-w-md w-full text-center">
                <div className="mb-8 flex justify-center">
                    <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
                        <ShieldAlert className="w-12 h-12 text-destructive" />
                    </div>
                </div>

                <h1 className="text-4xl font-bold text-foreground mb-4">
                    Access Denied
                </h1>

                <p className="text-muted-foreground mb-8 text-lg">
                    You don't have permission to access this page. Please contact your administrator if you believe this is an error.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        variant="outline"
                        onClick={() => navigate(-1)}
                        className="gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </Button>

                    <Button
                        onClick={() => navigate("/")}
                        className="gap-2"
                    >
                        <Home className="w-4 h-4" />
                        Go Home
                    </Button>
                </div>

                <div className="mt-12 p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                        <strong>Need access?</strong> Contact your system administrator to request the necessary permissions.
                    </p>
                </div>
            </div>
        </div>
    );
}