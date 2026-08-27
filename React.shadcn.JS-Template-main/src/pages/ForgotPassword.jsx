import React, { useState, useEffect } from "react";
import { Mail, Phone, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  useForgotPasswordMutation,
  useVerifyForgotOtpMutation,
  useResetPasswordMutation,
} from "@/store/api/authApi";
import {
  setForgotPasswordOtpToken,
  setForgotPasswordResetToken,
  clearForgotPasswordFlow,
} from "@/store/slices/authSlice";
import { showSuccess, showError } from "@/lib/toast-utils";
import SEO from "../components/Seo";

export default function ForgotPasswordWithRedux() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Get forgot password state from Redux
  const forgotPasswordFlow = useSelector((state) => state.auth.forgotPasswordFlow);

  const [method, setMethod] = useState("email"); // "email" or "phone"
  const [step, setStep] = useState(1); // 1: Enter details, 2: Verify OTP, 3: Reset Password, 4: Success
  const [identifier, setIdentifier] = useState(""); // email or phone
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // RTK Query mutations
  const [forgotPassword, { isLoading: isSendingOtp }] = useForgotPasswordMutation();
  const [verifyForgotOtp, { isLoading: isVerifyingOtp }] = useVerifyForgotOtpMutation();
  const [resetPassword, { isLoading: isResettingPassword }] = useResetPasswordMutation();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      dispatch(clearForgotPasswordFlow());
    };
  }, [dispatch]);

  // Handle OTP input
  const handleOtpChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < 5) {
        document.getElementById(`otp-${index + 1}`)?.focus();
      }
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();

    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      document.getElementById("otp-5")?.focus();
    }
  };

  // Handle OTP backspace
  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  // Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();

    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier) {
      showError("Error", "Please enter your email or phone number");
      return;
    }

    // Basic validation
    if (method === "email" && !trimmedIdentifier.includes("@")) {
      showError("Error", "Please enter a valid email address");
      return;
    }

    try {
      const response = await forgotPassword({
        identifier: trimmedIdentifier,
      }).unwrap();

      // Store otpToken in Redux if provided
      if (response.data?.otpToken) {
        dispatch(setForgotPasswordOtpToken({
          otpToken: response.data.otpToken,
          identifier: trimmedIdentifier,
        }));
      }

      setStep(2);
      showSuccess("Success", response.message || "OTP sent successfully");
    } catch (error) {
      showError("Error", error?.data?.message || "Failed to send OTP");
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    const otpCode = otp.join("");

    if (otpCode.length !== 6) {
      showError("Error", "Please enter complete OTP");
      return;
    }

    const otpToken = forgotPasswordFlow.otpToken;

    if (!otpToken) {
      showError("Error", "Session expired. Please request OTP again");
      setStep(1);
      return;
    }

    try {
      const response = await verifyForgotOtp({
        otpToken,
        otp: otpCode,
      }).unwrap();

      // Store resetToken in Redux
      if (response.data?.resetToken) {
        dispatch(setForgotPasswordResetToken(response.data.resetToken));
      }

      setStep(3);
      showSuccess("Success", response.message || "OTP verified successfully");
    } catch (error) {
      const errorMessage = error?.data?.message || "Invalid OTP";
      showError("Error", errorMessage);

      // Clear OTP inputs on error
      setOtp(["", "", "", "", "", ""]);
      document.getElementById("otp-0")?.focus();
    }
  };

  // Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      showError("Error", "Please fill in all fields");
      return;
    }

    if (newPassword.length < 8) {
      showError("Error", "Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("Error", "Passwords don't match!");
      return;
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      showError("Error", "Password must contain uppercase, lowercase, number, and special character");
      return;
    }

    const resetToken = forgotPasswordFlow.resetToken;

    if (!resetToken) {
      showError("Error", "Session expired. Please start again");
      dispatch(clearForgotPasswordFlow());
      setStep(1);
      return;
    }

    try {
      const response = await resetPassword({
        resetToken,
        newPassword,
      }).unwrap();

      dispatch(clearForgotPasswordFlow());
      setStep(4);
      showSuccess("Success", response.message || "Password reset successfully");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/auth/login");
      }, 2000);
    } catch (error) {
      showError("Error", error?.data?.message || "Failed to reset password");
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setOtp(["", "", "", "", "", ""]);

    const identifierToUse = forgotPasswordFlow.identifier || identifier;

    if (!identifierToUse) {
      showError("Error", "Please enter your email or phone number first");
      setStep(1);
      return;
    }

    try {
      const response = await forgotPassword({
        identifier: identifierToUse,
      }).unwrap();

      if (response.data?.otpToken) {
        dispatch(setForgotPasswordOtpToken({
          otpToken: response.data.otpToken,
          identifier: identifierToUse,
        }));
      }

      showSuccess("Success", "OTP sent again!");
    } catch (error) {
      showError("Error", error?.data?.message || "Failed to resend OTP");
    }
  };

  return (

    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <SEO
        title="Forgot Password"
        description="Reset your password to access your learning materials."
        robots="noindex,nofollow"
      ></SEO>
      <div className="w-full max-w-md">
        {/* Back Button */}
        {step !== 4 && (
          <Link
            to="/auth/login"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {step === 4 ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : method === "email" ? (
                <Mail className="w-8 h-8 text-blue-600" />
              ) : (
                <Phone className="w-8 h-8 text-blue-600" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {step === 1 && "Forgot Password?"}
              {step === 2 && "Verify OTP"}
              {step === 3 && "Reset Password"}
              {step === 4 && "Success!"}
            </h1>
            <p className="text-gray-600">
              {step === 1 && "Choose how you want to reset your password"}
              {step === 2 && `We sent a 6-digit code to your ${method === "email" ? "email" : "phone"}`}
              {step === 3 && "Create a strong password for your account"}
              {step === 4 && "Your password has been reset successfully"}
            </p>
          </div>

          {/* Step 1: Choose Method & Enter Details */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              {/* Method Selection */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setMethod("email")}
                  className={`p-4 rounded-xl border-2 transition-all ${method === "email"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                    }`}
                >
                  <Mail
                    className={`w-6 h-6 mx-auto mb-2 ${method === "email" ? "text-blue-600" : "text-gray-400"
                      }`}
                  />
                  <p
                    className={`text-sm font-medium ${method === "email" ? "text-blue-600" : "text-gray-600"
                      }`}
                  >
                    Email
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod("phone")}
                  className={`p-4 rounded-xl border-2 transition-all ${method === "phone"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                    }`}
                >
                  <Phone
                    className={`w-6 h-6 mx-auto mb-2 ${method === "phone" ? "text-blue-600" : "text-gray-400"
                      }`}
                  />
                  <p
                    className={`text-sm font-medium ${method === "phone" ? "text-blue-600" : "text-gray-600"
                      }`}
                  >
                    Phone
                  </p>
                </button>
              </div>

              {/* Email/Phone Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {method === "email" ? "Email Address" : "Phone Number"}
                </label>
                <input
                  type={method === "email" ? "email" : "tel"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    method === "email"
                      ? "your.email@example.com"
                      : "+91 1234567890"
                  }
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSendingOtp}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingOtp ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </span>
                ) : (
                  "Send OTP"
                )}
              </button>
            </form>
          )}

          {/* Step 2: Verify OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {/* OTP Inputs */}
              <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 transition-all"
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isVerifyingOtp || otp.some((d) => !d)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifyingOtp ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Verifying...
                  </span>
                ) : (
                  "Verify OTP"
                )}
              </button>

              {/* Resend OTP */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isSendingOtp}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Didn't receive code? Resend
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Reset Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              {/* Password Requirements */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Password must contain:</p>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li>At least 8 characters</li>
                      <li>Uppercase and lowercase letters</li>
                      <li>At least one number</li>
                      <li>At least one special character</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    minLength={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isResettingPassword}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResettingPassword ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Resetting...
                  </span>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">
                  You can now login with your new password
                </p>
              </div>
              <Link
                to="/auth/login"
                className="block w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Go to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>

  );
}