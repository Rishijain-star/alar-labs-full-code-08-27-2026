import api from "@/lib/axios";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function extractOrderPayload(res) {
  return res?.data?.data || res?.data || {};
}

/**
 * Open Razorpay checkout, verify payment, and enroll the user.
 * @param {'lab'|'course'} type
 */
export async function checkoutPayment({
  type,
  id,
  title,
  userEmail,
  userName,
  merchantName = "ALAR Labs",
  quantity = 1,
}) {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    throw new Error("Could not load payment gateway. Check your connection and try again.");
  }

  let orderRes;
  try {
    orderRes = await api.post(
      "/me/payments/create-order",
      { type, id, quantity },
      { withCredentials: true }
    );
  } catch (err) {
    const msg = err.response?.data?.message || err.message || "Failed to initiate payment";
    throw new Error(msg);
  }
  const { orderId, amount, currency, keyId } = extractOrderPayload(orderRes);
  if (!orderId || !keyId) {
    throw new Error("Could not start payment. Please try again.");
  }

  const itemLabel =
    type === "course"
      ? "Course enrollment"
      : type === "webinar"
        ? "Webinar registration"
        : type === "training_program"
          ? "Training program enrollment"
          : type === "voucher"
            ? "Voucher purchase"
            : "Lab enrollment";

  return new Promise((resolve, reject) => {
    const isLocalDev = import.meta.env.DEV;

    const options = {
      key: keyId,
      amount,
      currency: currency || "INR",
      name: merchantName,
      description: title || itemLabel,
      order_id: orderId,
      prefill: {
        email: userEmail || "",
        name: userName || "",
      },
      theme: { color: "#2563eb" },
      handler: async (response) => {
        try {
          await api.post(
            "/me/payments/verify",
            {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              type,
              id,
              quantity,
            },
            { withCredentials: true }
          );
          try {
            const { store } = await import("@/store/store");
            const { learningApi } = await import("@/store/api/learningApi");
            const { userApi } = await import("@/store/api/userApi");
            store.dispatch(learningApi.util.invalidateTags(["Learning"]));
            store.dispatch(userApi.util.invalidateTags(["DashboardStats"]));
          } catch (_) {}
          resolve(response);
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
      ...(isLocalDev && {
        config: {
          display: {
            hide: [{ method: "upi", flows: ["qr"] }],
          },
        },
      }),
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", (response) => {
      const msg = response?.error?.description || "Payment failed";
      reject(new Error(msg));
    });
    rzp.open();
  });
}

/**
 * Open Razorpay checkout for a lab, verify payment, and enroll the user.
 */
export async function checkoutLabPayment({
  labId,
  labTitle,
  userEmail,
  userName,
  merchantName,
}) {
  return checkoutPayment({
    type: "lab",
    id: labId,
    title: labTitle,
    userEmail,
    userName,
    merchantName,
  });
}

/**
 * Open Razorpay checkout for a course, verify payment, and enroll the user.
 */
export async function checkoutCoursePayment({
  courseId,
  courseTitle,
  userEmail,
  userName,
  merchantName,
}) {
  return checkoutPayment({
    type: "course",
    id: courseId,
    title: courseTitle,
    userEmail,
    userName,
    merchantName,
  });
}

/**
 * Open Razorpay checkout for a webinar, verify payment, and register the user.
 */
export async function checkoutWebinarPayment({
  webinarId,
  webinarTitle,
  userEmail,
  userName,
  merchantName,
}) {
  return checkoutPayment({
    type: "webinar",
    id: webinarId,
    title: webinarTitle,
    userEmail,
    userName,
    merchantName,
  });
}

/**
 * Open Razorpay checkout for an expert-led training program.
 */
export async function checkoutTrainingProgramPayment({
  programId,
  programTitle,
  userEmail,
  userName,
  merchantName,
}) {
  return checkoutPayment({
    type: "training_program",
    id: programId,
    title: programTitle,
    userEmail,
    userName,
    merchantName,
  });
}

/**
 * Open Razorpay checkout for a voucher.
 */
export async function checkoutVoucherPayment({
  voucherId,
  voucherTitle,
  userEmail,
  userName,
  merchantName,
  quantity = 1,
}) {
  return checkoutPayment({
    type: "voucher",
    id: voucherId,
    title: voucherTitle,
    userEmail,
    userName,
    merchantName,
    quantity,
  });
}
