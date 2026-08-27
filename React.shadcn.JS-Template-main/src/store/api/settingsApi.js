import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const settingsApi = createApi({
  reducerPath: "settingsApi",
  baseQuery: axiosBaseQuery({ showToast: true }),
  tagTypes: ["Settings", "PlatformSettings"],
  endpoints: (builder) => ({
    getSettings: builder.query({
      query: () => ({
        url: "/owner/settings",
        method: "GET",
        meta: { withCredentials: true, showToast: false },
      }),
      providesTags: ["Settings"],
    }),
    updateSettingsSection: builder.mutation({
      query: ({ section, data }) => ({
        url: `/owner/settings/${section}`,
        method: "PUT",
        data,
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Settings saved" },
      }),
      invalidatesTags: ["Settings", { type: "PlatformSettings", id: "PUBLIC" }],
    }),
    sendTestEmail: builder.mutation({
      query: (body) => ({
        url: "/owner/settings/email/test",
        method: "POST",
        data: body,
        meta: { withCredentials: true, showSuccessToast: true, successMessage: "Test email sent" },
      }),
    }),
  }),
});

export const {
  useGetSettingsQuery,
  useUpdateSettingsSectionMutation,
  useSendTestEmailMutation,
} = settingsApi;
