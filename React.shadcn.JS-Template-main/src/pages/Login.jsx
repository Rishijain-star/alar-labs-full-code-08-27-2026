// src/pages/Login.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { showSuccess, showError } from "@/lib/toast-utils";
import { useLoginMutation } from "@/store/api/authApi";
import { authApi } from "@/store/api/authApi";
import { useDispatch } from "react-redux";
import SEO from "../components/Seo";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const fromLoc = location.state?.from;
  const redirectAfterLogin = fromLoc
    ? `${fromLoc.pathname}${fromLoc.search ?? ""}${fromLoc.hash ?? ""}`
    : "/app/dashboard";
  const [login, { isLoading }] = useLoginMutation();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Get device info
  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;

    // Simple browser detection
    let browser = "Unknown";
    let browserVersion = "";
    if (userAgent.includes("Chrome")) {
      browser = "Chrome";
      browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || "";
    } else if (userAgent.includes("Firefox")) {
      browser = "Firefox";
      browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || "";
    } else if (userAgent.includes("Safari")) {
      browser = "Safari";
      browserVersion = userAgent.match(/Version\/(\d+)/)?.[1] || "";
    }

    // Simple OS detection
    let os = "Unknown";
    let osVersion = "";
    if (platform.includes("Win")) {
      os = "Windows";
      osVersion = "10";
    } else if (platform.includes("Mac")) {
      os = "macOS";
    } else if (platform.includes("Linux")) {
      os = "Linux";
    }

    // Device type detection
    let deviceType = "desktop";
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      deviceType = "mobile";
    }

    // Generate a simple device fingerprint
    const deviceFingerprint = btoa(`${userAgent}-${platform}-${navigator.language}`).substring(0, 32);

    return {
      deviceFingerprint,
      deviceName: `${browser} on ${os}`,
      deviceType,
      browser,
      browserVersion,
      os,
      osVersion,
      userAgent,
      ipAddress: "auto-detect", // Will be detected by backend
      isTrusted: true
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const deviceInfo = getDeviceInfo();

      const response = await login({
        email: formData.email,
        password: formData.password,
        remember_me: rememberMe,
        device_info: deviceInfo,
      }).unwrap();

      // Check if response is successful
      if (response.success && response.status === 200) {
        // Check if MFA is required
        if (response.data?.requires_mfa && response.data?.mfa_token) {
          // MFA is required - navigate to MFA verification page
          showSuccess("Success", "Please verify your identity");
          navigate("/auth/verify-mfa", { replace: true });
        } else {
          // Normal login - no MFA required
          showSuccess("Success", response.message || "Login successful!");
          // The authSlice matcher will handle saving the session data
          navigate(redirectAfterLogin, { replace: true });
        }
      } else {
        showError("Error", response.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      // Error toast is shown by authApi axiosBaseQuery (showToast: true)
    }
  };

  // Load Google Identity Services
  useEffect(() => {
    const existing = document.getElementById("google-client-script");
    if (existing) {
      setGoogleReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "google-client-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    document.head.appendChild(script);
  }, []);

  const handleGoogleCredential = async (credential) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !credential) {
      showError("Error", "Missing VITE_GOOGLE_CLIENT_ID");
      return;
    }
    setGoogleLoading(true);
    try {
      const deviceInfo = getDeviceInfo();
      const result = await dispatch(
        authApi.endpoints.googlePopupLogin.initiate({
          idToken: credential,
          deviceInfo,
          rememberMe: true,
        })
      ).unwrap();
      if (result?.success) {
        showSuccess("Success", "Logged in with Google");
        navigate(redirectAfterLogin, { replace: true });
      } else {
        showError("Error", result?.message || "Google login failed");
      }
    } catch {
      showError("Error", "Google login failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (!googleReady) return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google?.accounts?.id) return;
    // @ts-ignore
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: ({ credential }) => handleGoogleCredential(credential),
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
    });
    const mountNode = document.getElementById("google-login-btn");
    if (mountNode) {
      mountNode.innerHTML = "";
      // @ts-ignore
      window.google.accounts.id.renderButton(mountNode, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: 360,
        text: "continue_with",
        shape: "rectangular",
      });
    }
  }, [googleReady]);

  return (
    <AuthLayout image="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800">
      <SEO
        title="Login"
        description="Sign in to your account to access your learning materials."
        robots="noindex,nofollow"
      />
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
          <p className="text-muted-foreground">
            Sign in to continue your learning journey
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? "border-destructive" : ""}
              autoComplete="username"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/auth/forgot-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? "border-destructive pr-10" : "pr-10"}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={setRememberMe}
            />
            <label
              htmlFor="remember"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Remember me
            </label>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/auth/register" className="font-medium text-primary hover:underline">
              Create account
            </Link>
          </p>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="flex justify-center">
            {googleLoading ? (
              <Button type="button" variant="outline" className="w-full" size="lg" disabled>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </Button>
            ) : (
              <div id="google-login-btn" className="w-full flex justify-center" />
            )}
          </div>
        </form>

        {/* Terms and Privacy */}
        <p className="text-xs text-center text-muted-foreground">
          By signing in, you agree to our{" "}
          <Link to="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
