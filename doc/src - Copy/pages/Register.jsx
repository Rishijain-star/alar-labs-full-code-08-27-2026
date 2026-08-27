// src/pages/Register.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useRegisterMutation } from "@/store/api/authApi";
import { authApi } from "@/store/api/authApi";
import { setTempAuth } from "@/store/slices/authSlice";
import { showSuccess, showError } from "@/lib/toast-utils";
import SEO from "../components/Seo";

export default function Register() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [register, { isLoading }] = useRegisterMutation();
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "", // ✅ Changed from 'mobile' to 'phone'
    password: "",
    confirmPassword: "",
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

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.phone.trim()) { // ✅ Changed from 'mobile' to 'phone'
      newErrors.phone = "Mobile number is required";
    } else if (!/^[0-9]{10}$/.test(formData.phone)) {
      newErrors.phone = "Mobile number must be 10 digits";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // ✅ Match backend API format
      const response = await register({
        email: formData.email,
        password: formData.password,
        phone: formData.phone, // ✅ Changed from 'mobile' to 'phone'
        full_name: `${formData.firstName} ${formData.lastName}`, // ✅ Backend expects 'full_name'
        verification_type: "email", // backend default; explicit so OTP is emailed, not SMS
      }).unwrap();

      console.log("Registration response:", response);

      // API returns snake_case: data.otp_token (see backend authController.register)
      const payload = response?.data ?? {};
      const otpToken = payload.otp_token ?? payload.otpToken;
      if (!otpToken) {
        showError("Error", "Registration succeeded but no verification token was returned.");
        return;
      }

      dispatch(setTempAuth({
        otpToken,
        otp: payload.otp,
        mobile: formData.phone,
        phone: formData.phone,
        email: formData.email,
      }));

      const vType = payload.verification_type ?? "email";
      showSuccess(
        "Success",
        vType === "phone"
          ? "OTP sent to your phone number"
          : "OTP sent to your email address"
      );
      navigate("/auth/verify-phone", { replace: true });
    } catch (err) {
      console.error("Registration error:", err);
      showError("Error", err?.data?.message || "Registration failed");
    }
  };

  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const deviceFingerprint = btoa(`${userAgent}-${platform}-${navigator.language}`).substring(0, 32);
    return {
      deviceFingerprint,
      deviceName: "Google Sign Up",
      deviceType: /Mobile|Android|iPhone|iPad/.test(userAgent) ? "mobile" : "desktop",
      browser: "Unknown",
      browserVersion: "",
      os: "Unknown",
      osVersion: "",
      userAgent,
      ipAddress: "auto-detect",
      isTrusted: true
    };
  };

  const handleGoogleCredential = async (credential) => {
    if (!credential) return;
    setGoogleLoading(true);
    try {
      const result = await dispatch(
        authApi.endpoints.googlePopupLogin.initiate({
          idToken: credential,
          deviceInfo: getDeviceInfo(),
          rememberMe: true,
        })
      ).unwrap();
      if (result?.success) {
        showSuccess("Success", "Signed in with Google");
        navigate("/app/dashboard", { replace: true });
      } else {
        showError("Error", result?.message || "Google sign-up failed");
      }
    } catch {
      showError("Error", "Google sign-up failed");
    } finally {
      setGoogleLoading(false);
    }
  };

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
    const mountNode = document.getElementById("google-register-btn");
    if (mountNode) {
      mountNode.innerHTML = "";
      // @ts-ignore
      window.google.accounts.id.renderButton(mountNode, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: 360,
        text: "signup_with",
        shape: "rectangular",
      });
    }
  }, [googleReady]);

  return (


    <AuthLayout image="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800">
      <SEO
        title="Register"
        description="Create a new account to access your learning materials ."
        robots="noindex,nofollow"
      ></SEO>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Create Your Account</h1>
          <p className="text-muted-foreground">
            Join thousands of learners mastering tech skills
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name & Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="First name"
                value={formData.firstName}
                onChange={handleChange}
                className={errors.firstName ? "border-destructive" : ""}
                autoComplete="given-name"
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Last name"
                value={formData.lastName}
                onChange={handleChange}
                className={errors.lastName ? "border-destructive" : ""}
                autoComplete="family-name"
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>

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
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Mobile Number */}
          <div className="space-y-2">
            <Label htmlFor="phone">Mobile Number</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="Enter 10-digit mobile number"
              value={formData.phone}
              onChange={handleChange}
              className={errors.phone ? "border-destructive" : ""}
              maxLength={10}
              autoComplete="tel"
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone}</p>
            )}
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create password"
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? "border-destructive pr-10" : "pr-10"}
                  autoComplete="new-password"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>

          {/* Sign In Link */}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth/login" className="font-medium text-primary hover:underline">
              Sign in
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

          {/* Google Sign Up */}
          <div className="flex justify-center">
            {googleLoading ? (
              <Button type="button" variant="outline" className="w-full" size="lg" disabled>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </Button>
            ) : (
              <div id="google-register-btn" className="w-full flex justify-center" />
            )}
          </div>
        </form>

        {/* Terms and Privacy */}
        <p className="text-xs text-center text-muted-foreground">
          By creating an account, you agree to our{" "}
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