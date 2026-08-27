// src/pages/VerifyMfa.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Shield, ArrowLeft } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useSelector, useDispatch } from "react-redux";
import { useVerifyMfaMutation, useResendMfaOtpMutation } from "@/store/api/authApi";
import { showSuccess, showError } from "@/lib/toast-utils";
import { clearMfaAuth } from "../store/slices/authSlice";

export default function VerifyMfa() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [verifyMfa, { isLoading }] = useVerifyMfaMutation();
    const [resendMfaOtp] = useResendMfaOtpMutation();
    const mfaState = useSelector((state) => state.auth.mfaAuth);

    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [timer, setTimer] = useState(59);
    const [canResend, setCanResend] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const inputRefs = useRef([]);

    // Store initial state in ref to prevent re-checking
    const initialStateRef = useRef(mfaState);
    const hasCheckedRef = useRef(false);

    // Check ONLY ONCE on mount
    useEffect(() => {
        if (!hasCheckedRef.current) {
            hasCheckedRef.current = true;

            const state = initialStateRef.current;
            if (!state?.mfaToken) {
                navigate("/auth/login", { replace: true });
            }
        }
    }, []); // Empty array - runs only once

    // Countdown timer - separate useEffect
    useEffect(() => {
        if (timer > 0) {
            const id = setInterval(() => {
                setTimer((t) => t - 1);
            }, 1000);
            return () => clearInterval(id);
        } else {
            setCanResend(true);
        }
    }, [timer]); // Only depends on timer

    const handleChange = (index, value) => {
        if (value && !/^\d$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyDown = (index, e) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (!text) return;
        const digits = text.split("");
        setOtp([...digits, ...Array(6 - digits.length).fill("")]);
        const next = Math.min(digits.length, 5);
        inputRefs.current[next]?.focus();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isLoading) {
            return;
        }

        const otpCode = otp.join("");

        if (otpCode.length !== 6) {
            showError("Error", "Please enter complete OTP");
            return;
        }

        try {
            const response = await verifyMfa({
                mfaToken: mfaState.mfaToken,
                code: otpCode,
            }).unwrap();

            if (response.success && response.status === 200) {
                showSuccess("Success", "Login successful!");
                dispatch(clearMfaAuth());

                // Navigate to dashboard
                setTimeout(() => {
                    navigate("/app/dashboard", { replace: true });
                }, 1000);
            } else {
                showError("Error", response.message || "MFA verification failed");
            }
        } catch (err) {
            showError("Error", err?.data?.message || "Failed to verify MFA");
        }
    };

    const handleResend = async () => {
        if (!canResend || isResending) return;
        setIsResending(true);

        try {
            await resendMfaOtp({
                mfaToken: mfaState.mfaToken
            }).unwrap();

            showSuccess("Success", "OTP resent successfully!");
            setTimer(59);
            setCanResend(false);
            setOtp(["", "", "", "", "", ""]);
            inputRefs.current[0]?.focus();
        } catch (err) {
            showError("Error", err?.data?.message || "Failed to resend OTP");
        } finally {
            setIsResending(false);
        }
    };

    if (!mfaState?.mfaToken) {
        return null;
    }

    return (
        <AuthLayout image="https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800">
            <div className="space-y-6">
                <Link
                    to="/auth/login"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                </Link>

                <div className="space-y-2 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Two-Factor Authentication
                    </h1>
                    <p className="text-muted-foreground">
                        We sent a 6-digit verification code to your registered contact
                    </p>
                    {mfaState.method && (
                        <p className="text-foreground font-medium">
                            Via {mfaState.method === 'email' ? 'Email' : 'SMS'}
                        </p>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-center gap-2">
                            {otp.map((digit, index) => (
                                <Input
                                    key={index}
                                    ref={el => inputRefs.current[index] = el}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    onPaste={index === 0 ? handlePaste : undefined}
                                    className="w-12 h-12 text-center text-lg font-semibold"
                                    autoFocus={index === 0}
                                    disabled={isLoading}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="text-center space-y-2">
                        {!canResend ? (
                            <p className="text-sm text-muted-foreground">
                                Resend code in{" "}
                                <span className="font-semibold text-foreground">
                                    00:{timer.toString().padStart(2, "0")}
                                </span>
                            </p>
                        ) : (
                            <Button
                                type="button"
                                variant="link"
                                onClick={handleResend}
                                disabled={isResending}
                                className="text-primary"
                            >
                                {isResending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Resending...
                                    </>
                                ) : (
                                    "Resend OTP"
                                )}
                            </Button>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        size="lg"
                        disabled={isLoading || otp.join("").length !== 6}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            "Verify & Continue"
                        )}
                    </Button>
                </form>

                <div className="bg-muted rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium">Didn't receive the code?</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Check your {mfaState.method === 'email' ? 'email inbox and spam folder' : 'SMS messages'}</li>
                        <li>Ensure you have {mfaState.method === 'email' ? 'internet' : 'network'} connectivity</li>
                        <li>Wait for 60 seconds before requesting a new code</li>
                        <li>Contact support if the issue persists</li>
                    </ul>
                </div>
            </div>
        </AuthLayout>
    );
}