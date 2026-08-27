import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "@/lib/axios";

export const voucherApi = createApi({
  reducerPath: "voucherApi",
  baseQuery: axiosBaseQuery({ showToast: true }),
  tagTypes: ["Voucher"],
  endpoints: (builder) => ({
    getPublicVouchers: builder.query({
      query: (params = {}) => ({
        url: "/vouchers",
        method: "GET",
        params,
        meta: { withCredentials: false },
      }),
      providesTags: ["Voucher"],
    }),
    getOwnerVouchers: builder.query({
      query: (params = {}) => ({
        url: "/owner/vouchers",
        method: "GET",
        params,
        meta: { withCredentials: true },
      }),
      providesTags: ["Voucher"],
    }),
    createVoucher: builder.mutation({
      query: (data) => ({
        url: "/owner/vouchers",
        method: "POST",
        data,
        meta: { withCredentials: true },
      }),
      invalidatesTags: ["Voucher"],
    }),
    updateVoucher: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/owner/vouchers/${id}`,
        method: "PUT",
        data,
        meta: { withCredentials: true },
      }),
      invalidatesTags: ["Voucher"],
    }),
    deleteVoucher: builder.mutation({
      query: (id) => ({
        url: `/owner/vouchers/${id}`,
        method: "DELETE",
        meta: { withCredentials: true },
      }),
      invalidatesTags: ["Voucher"],
    }),
    purchaseVoucher: builder.mutation({
      query: (id) => ({
        url: `/me/vouchers/${id}/purchase`,
        method: "POST",
        meta: { withCredentials: true },
      }),
      invalidatesTags: ["Voucher"],
    }),
    applyVoucher: builder.mutation({
      query: (data) => ({
        url: "/me/vouchers/apply",
        method: "POST",
        data,
        meta: { withCredentials: true },
      }),
    }),
  }),
});

export const {
  useGetPublicVouchersQuery,
  useGetOwnerVouchersQuery,
  useCreateVoucherMutation,
  useUpdateVoucherMutation,
  useDeleteVoucherMutation,
  usePurchaseVoucherMutation,
  useApplyVoucherMutation,
} = voucherApi;
