// src/pages/VerifyPhone.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Phone, ArrowLeft } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useSelector, useDispatch } from "react-redux";
import { useVerifyOtpMutation, useResendOtpMutation } from "@/store/api/authApi";
import { showSuccess, showError } from "@/lib/toast-utils";
import { clearTempAuth, setTempAuth } from "@/store/slices/authSlice";

export default function VerifyPhone() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [verifyOtp, { isLoading }] = useVerifyOtpMutation();
    const [resendOtp] = useResendOtpMutation();
    const fullState = useSelector((state) => state.auth.tempAuth);

    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [timer, setTimer] = useState(59);
    const [canResend, setCanResend] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const inputRefs = useRef([]);

    const phoneNumber = fullState?.mobile || fullState?.phone;

    // Require otpToken + phone (Register must store otp_token from API as otpToken)
    useEffect(() => {
        const token = fullState?.otpToken;
        const phone = fullState?.mobile || fullState?.phone;
        if (!token || !phone) {
            navigate("/auth/register", { replace: true });
        }
    }, [fullState?.otpToken, fullState?.mobile, fullState?.phone, navigate]);

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
    }, [timer]); // ✅ Only depends on timer

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
            const response = await verifyOtp({
                otpToken: fullState.otpToken,
                otp: otpCode,
            }).unwrap();

            showSuccess("Success", "Registration successful. You can now login.");
            dispatch(clearTempAuth());

            setTimeout(() => {
                navigate("/auth/login", { replace: true });
            }, 1000);
        } catch (err) {
            showError("Error", err?.data?.message || "Failed to verify OTP");
        }
    };

    const handleResend = async () => {
        if (!canResend || isResending) return;
        setIsResending(true);

        try {
            const res = await resendOtp({
                otp_token: fullState.otpToken,
            }).unwrap();

            const inner = res?.data ?? {};
            const newToken = inner.otp_token ?? inner.otpToken;
            if (newToken && newToken !== fullState.otpToken) {
                dispatch(
                    setTempAuth({
                        ...fullState,
                        otpToken: newToken,
                    })
                );
            }

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

    if (!phoneNumber) {
        return null;
    }

    return (
        <AuthLayout image="https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800">
            <div className="space-y-6">
                <Link
                    to="/auth/register"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to registration
                </Link>

                <div className="space-y-2 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Phone className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Verify Your Mobile Number
                    </h1>
                    <p className="text-muted-foreground">
                        We sent a 6-digit code to your registered mobile number
                    </p>
                    <p className="text-foreground font-medium">
                        {phoneNumber.replace(/(\d{2})(\d{4})(\d{4})/, "+91 $1 **** $3")}
                        your otp is {fullState.otp}
                    </p>
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
                            "Verify & Proceed"
                        )}
                    </Button>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => navigate("/auth/register")}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
                        >
                            Change mobile number
                        </button>
                    </div>
                </form>

                <div className="bg-muted rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium">Didn't receive the code?</p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Check if your mobile number is correct</li>
                        <li>Ensure you have network connectivity</li>
                        <li>Check your SMS inbox and spam folder</li>
                        <li>Wait for 60 seconds before requesting a new code</li>
                    </ul>
                </div>
            </div>
        </AuthLayout>
    );
}