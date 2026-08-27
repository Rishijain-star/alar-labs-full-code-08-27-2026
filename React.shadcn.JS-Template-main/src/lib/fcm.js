let cachedMessaging = null;

async function ensureActiveServiceWorker(scriptUrl = "/firebase-messaging-sw.js") {
  const registration = await navigator.serviceWorker.register(scriptUrl);

  if (registration.active) {
    return registration;
  }

  await navigator.serviceWorker.ready;
  const refreshed = await navigator.serviceWorker.getRegistration(scriptUrl);
  if (refreshed?.active) {
    return refreshed;
  }

  // Small fallback wait for slow SW activation in dev mode.
  await new Promise((resolve) => setTimeout(resolve, 500));
  const finalRegistration = await navigator.serviceWorker.getRegistration(scriptUrl);
  return finalRegistration || registration;
}

async function getMessagingInstance() {
  if (cachedMessaging) return cachedMessaging;

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  const hasConfig = apiKey && authDomain && projectId && messagingSenderId && appId;
  if (!hasConfig || typeof window === "undefined") return null;

  const [{ initializeApp, getApps, getApp }, { getMessaging }] = await Promise.all([
    import("@firebase/app"),
    import("@firebase/messaging"),
  ]);

  const app =
    getApps().length > 0
      ? getApp()
      : initializeApp({
        apiKey,
        authDomain,
        projectId,
        messagingSenderId,
        appId,
        measurementId: "G-CV548019LK",
      });

  cachedMessaging = getMessaging(app);
  return cachedMessaging;
}

export async function getBrowserFcmToken() {
  try {
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

    const hasConfig = vapidKey;
    if (!hasConfig || typeof window === "undefined" || !("Notification" in window)) {
      return null;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const [{ getToken }, messaging] = await Promise.all([
      import("@firebase/messaging"),
      getMessagingInstance(),
    ]);
    if (!messaging) return null;

    const serviceWorkerRegistration = await ensureActiveServiceWorker("/firebase-messaging-sw.js");
    if (!serviceWorkerRegistration?.active) {
      console.warn("FCM skipped: service worker is not active yet.");
      return null;
    }
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration });
    if (!token) return null;
    localStorage.setItem("fcm_device_token", token);
    return token;
  } catch (error) {
    console.error("FCM token generation failed:", error);
    return null;
  }
}

export async function subscribeToForegroundMessages(onPayload) {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return () => { };

    const { onMessage } = await import("@firebase/messaging");
    return onMessage(messaging, (payload) => {
      if (typeof onPayload === "function") onPayload(payload);
    });
  } catch (error) {
    console.error("FCM foreground listener setup failed:", error);
    return () => { };
  }
}

