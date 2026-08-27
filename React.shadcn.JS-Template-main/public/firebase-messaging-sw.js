self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());

// Handles background pushes delivered by FCM Web Push.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch (_) {
    payload = { notification: { title: "New notification", body: event.data.text() } };
  }

  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || "ALAR Labs";
  const body = notification.body || data.body || data.message || "You have a new notification.";
  const icon = notification.icon || "/favicon.ico";
  const badge = notification.badge || "/favicon.ico";
  const clickUrl = data.click_action || data.url || "/app/dashboard";
  // Debug trace visible in browser DevTools > Application > Service Workers > Console
  console.log("[FCM SW] push received", { title, body, clickUrl, payload });

  // Forward background push info to all open app tabs so it also appears
  // in the normal page console (not only service-worker console).
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "FCM_SW_PUSH",
          source: "service-worker",
          title,
          body,
          clickUrl,
          payload,
          timestamp: Date.now(),
        });
      });
    })
  );

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url: clickUrl },
      tag: data.tag || "alar-labs-push",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/app/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
      return undefined;
    })
  );
});

