// src/store/api/authApi.js
import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const authApi = createApi({
    reducerPath: "authApi",
    baseQuery: axiosBaseQuery({ showToast: true }),
    tagTypes: ["Auth"],

    endpoints: (builder) => ({
        // REGISTER
        register: builder.mutation({
            query: (data) => ({
                url: "/auth/register",
                method: "POST",
                data,
                meta: {
                    withCredentials: false
                },
            }),
        }),

        // VERIFY REGISTER OTP (backend expects otp_token + otp)
        verifyOtp: builder.mutation({
            query: ({ otpToken, otp }) => ({
                url: "/auth/register/verify",
                method: "POST",
                data: { otp_token: otpToken, otp },
                meta: {
                    withCredentials: false
                },
            }),
        }),

        // RESEND OTP
        resendOtp: builder.mutation({
            query: (data) => ({
                url: "/auth/otp/resend",
                method: "POST",
                data,
                meta: {
                    withCredentials: false
                },
            }),
        }),

        // LOGIN
        login: builder.mutation({
            query: (data) => ({
                url: "/auth/login",
                method: "POST",
                data,
                meta: {
                    withCredentials: true
                },
            }),
        }),

        // VERIFY MFA
        verifyMfa: builder.mutation({
            query: ({ mfaToken, code }) => ({
                url: "/auth/mfa/verify",
                method: "POST",
                data: { mfaToken, code },
                meta: {
                    withCredentials: true
                },
            }),
        }),

        // RESEND MFA OTP
        resendMfaOtp: builder.mutation({
            query: ({ mfaToken }) => ({
                url: "/auth/mfa/resend",
                method: "POST",
                data: { mfaToken },
                meta: {
                    withCredentials: false
                },
            }),
        }),

        // FORGOT PASSWORD - Send OTP
        forgotPassword: builder.mutation({
            query: (data) => ({
                url: "/auth/forgot-password",
                method: "POST",
                data,
                meta: {
                    withCredentials: false
                },
            }),
        }),

        // VERIFY FORGOT PASSWORD OTP
        verifyForgotOtp: builder.mutation({
            query: ({ otpToken, otp }) => ({
                url: "/auth/forgot-password/verify-otp",
                method: "POST",
                data: { otpToken, otp },
                meta: {
                    withCredentials: false
                },
            }),
        }),

        // RESET PASSWORD
        resetPassword: builder.mutation({
            query: ({ resetToken, newPassword }) => ({
                url: "/auth/reset-password",
                method: "POST",
                data: { resetToken, newPassword },
                meta: {
                    withCredentials: false
                },
            }),
        }),

        // GOOGLE POPUP LOGIN (ID token flow)
        googlePopupLogin: builder.mutation({
            query: ({ idToken, deviceInfo, rememberMe = true }) => ({
                url: "/auth/oauth/google/popup",
                method: "POST",
                data: { id_token: idToken, device_info: deviceInfo, remember_me: rememberMe },
                meta: {
                    withCredentials: true,
                    showSuccessToast: true,
                    successMessage: "Login successful",
                },
            }),
        }),

        // LOGOUT
        logout: builder.mutation({
            query: () => ({
                url: "/auth/logout",
                method: "POST",
                meta: {
                    withCredentials: true
                },
            }),
        }),

        // REFRESH TOKEN — backend expects session_id (cookie fallback when omitted)
        refreshToken: builder.mutation({
            query: ({ sessionId } = {}) => ({
                url: "/owner/refresh",
                method: "POST",
                data: {
                    session_id: sessionId || undefined,
                    sessionId: sessionId || undefined,
                },
                meta: {
                    withCredentials: true,
                    // Don't show toast for refresh - it's background operation
                    showToast: false,
                },
            }),
        }),
    }),
});

export const {
    useRegisterMutation,
    useVerifyOtpMutation,
    useResendOtpMutation,
    useLoginMutation,
    useVerifyMfaMutation,
    useResendMfaOtpMutation,
    useForgotPasswordMutation,
    useVerifyForgotOtpMutation,
    useResetPasswordMutation,
    useLogoutMutation,
    useRefreshTokenMutation,
} = authApi;
