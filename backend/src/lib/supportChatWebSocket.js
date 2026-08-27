const WebSocket = require("ws");
const { URL } = require("url");
const { verifyAccessToken } = require("../utils/token");
const rbacService = require("../services/rbac/roleService");
const { SupportTicket } = require("../models");
const { supportChatService, REDIS_PREFIX } = require("../services/supportChatService");
const redisManager = require("./redisManager");
const logger = require("./logger");
const { isOriginAllowed } = require("./allowedOrigins");

const clientsByTicket = new Map();

const AUTH_TIMEOUT_MS = 12_000;
const MAX_AUTH_PAYLOAD_BYTES = 4096;
const HEARTBEAT_MS = 30_000;

function addClient(ticketId, ws) {
  if (!clientsByTicket.has(ticketId)) clientsByTicket.set(ticketId, new Set());
  clientsByTicket.get(ticketId).add(ws);
  ws.__ticketId = ticketId;
}

function removeClient(ticketId, ws) {
  const set = clientsByTicket.get(ticketId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) clientsByTicket.delete(ticketId);
  if (ws.__ticketId) delete ws.__ticketId;
}

function broadcastLocal(ticketId, raw, exceptWs = null) {
  const set = clientsByTicket.get(ticketId);
  if (!set) return;
  for (const ws of set) {
    if (exceptWs && ws === exceptWs) continue;
    if (ws.readyState === WebSocket.OPEN) ws.send(raw);
  }
}

function isUserConnectedToTicket(ticketId, userId) {
  if (!ticketId || userId == null) return false;
  const set = clientsByTicket.get(String(ticketId));
  if (!set) return false;
  const uid = String(userId);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN && ws.__userId != null && String(ws.__userId) === uid) {
      return true;
    }
  }
  return false;
}

function safeSendJson(ws, obj) {
  try {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  } catch (_) {
    /* ignore */
  }
}

function isWsBrowserOriginOk(request) {
  const origin = request.headers.origin;
  const isProd = process.env.NODE_ENV === "production";
  if (!origin) {
    return !isProd;
  }
  return isOriginAllowed(origin);
}

let subscriberStarted = false;

async function startRedisSubscriber() {
  if (subscriberStarted) return;
  const main = await redisManager.getClientSafe();
  if (!main || typeof main.duplicate !== "function") {
    logger.warn("[support-ws] Redis unavailable — chat uses HTTP + local broadcast only");
    return;
  }
  try {
    const sub = main.duplicate();
    await sub.connect();
    await sub.pSubscribe(`${REDIS_PREFIX}*`, (message, _channel) => {
      try {
        const raw = typeof message === "string" ? message : message?.toString?.("utf8") || "{}";
        const parsed = JSON.parse(raw);
        const ticketId = parsed?.ticketId || parsed?.message?.ticket_id;
        if (ticketId) broadcastLocal(ticketId, raw);
      } catch (_) {
        /* ignore */
      }
    });
    subscriberStarted = true;
    logger.info("[support-ws] Redis subscriber ready");
  } catch (e) {
    logger.warn("[support-ws] Redis subscribe failed:", e.message);
  }
}

async function authenticateAndJoin(ws, ticketId, token) {
  const decoded = await verifyAccessToken(token);
  const userId = decoded.user_id;
  const perms = await rbacService.getUserPermissions(userId);
  const isAdmin = Array.isArray(perms) && perms.includes("view_support");
  const ticket = await SupportTicket.findByPk(ticketId);
  await supportChatService.assertTicketAccess(ticket, userId, isAdmin ? "admin" : undefined);
  ws.__userId = userId;
  ws.__displayName =
    decoded.full_name || decoded.name || decoded.email || (isAdmin ? "Support" : "User");
  ws.__senderRole = isAdmin ? "admin" : "user";
  ws.__lastTypingAt = 0;
  addClient(ticketId, ws);
  ws.__authenticated = true;
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });
  safeSendJson(ws, { type: "ready", ticketId });
}

function attachAuthedMessageHandler(ws) {
  ws.on("message", (data, isBinary) => {
    if (isBinary) return;
    let raw = "";
    try {
      raw = typeof data === "string" ? data : data?.toString?.("utf8") || "";
    } catch (_) {
      return;
    }
    if (raw.length > 512) return;
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (_) {
      return;
    }
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "ping") {
      safeSendJson(ws, { type: "pong", t: Date.now() });
      return;
    }

    const ticketId = ws.__ticketId;
    if (!ticketId) return;

    if (msg.type === "typing" || msg.type === "typing_stop") {
      const now = Date.now();
      if (msg.type === "typing") {
        if (now - (ws.__lastTypingAt || 0) < 1200) return;
        ws.__lastTypingAt = now;
      }
      const payload = JSON.stringify({
        type: msg.type,
        ticketId,
        userId: ws.__userId,
        displayName: ws.__displayName,
        senderRole: ws.__senderRole,
      });
      broadcastLocal(ticketId, payload, ws);
    }
  });
}

function pendingAuthConnection(ws, _request, ticketId) {
  let settled = false;
  const authTimer = setTimeout(() => {
    if (settled) return;
    settled = true;
    safeSendJson(ws, { type: "error", code: "AUTH_TIMEOUT", message: "Authentication timed out" });
    try {
      ws.close(4401, "auth timeout");
    } catch (_) { }
  }, AUTH_TIMEOUT_MS);

  const finishFail = (code, reason, clientCode, message) => {
    if (settled) return;
    settled = true;
    clearTimeout(authTimer);
    safeSendJson(ws, { type: "error", code: clientCode || "AUTH_FAILED", message: message || reason });
    try {
      ws.close(code, reason);
    } catch (_) { }
  };

  const finishSuccess = () => {
    if (settled) return;
    settled = true;
    clearTimeout(authTimer);
  };

  ws.once("message", async (data, isBinary) => {
    if (settled) return;
    if (isBinary) {
      finishFail(4403, "invalid auth", "INVALID_AUTH", "Expected JSON auth message");
      return;
    }
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (buf.length > MAX_AUTH_PAYLOAD_BYTES) {
      finishFail(4403, "payload too large", "PAYLOAD_TOO_LARGE", "Auth message too large");
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(buf.toString("utf8"));
    } catch (_) {
      finishFail(4403, "invalid json", "INVALID_AUTH", "Invalid JSON");
      return;
    }
    if (!parsed || parsed.type !== "auth" || typeof parsed.token !== "string") {
      finishFail(4403, "invalid auth", "INVALID_AUTH", "First message must be { type: \"auth\", token }");
      return;
    }
    const token = parsed.token.trim();
    if (!token || token.length > 4000) {
      finishFail(4403, "invalid token", "INVALID_AUTH", "Invalid token");
      return;
    }
    try {
      await authenticateAndJoin(ws, ticketId, token);
      finishSuccess();
      attachAuthedMessageHandler(ws);
    } catch (e) {
      logger.debug("[support-ws] auth failed", e.message);
      finishFail(4403, "unauthorized", "FORBIDDEN", "Not allowed for this ticket");
    }
  });

  ws.once("close", () => {
    clearTimeout(authTimer);
    if (ws.__ticketId) removeClient(ws.__ticketId, ws);
  });

  ws.once("error", () => {
    clearTimeout(authTimer);
    if (ws.__ticketId) removeClient(ws.__ticketId, ws);
  });
}

async function onConnection(ws, request) {
  try {
    const host = request.headers.host || "localhost";
    const u = new URL(request.url || "/", `http://${host}`);
    const ticketId = u.searchParams.get("ticketId");
    if (!ticketId) {
      safeSendJson(ws, { type: "error", code: "MISSING_TICKET", message: "ticketId is required" });
      try {
        ws.close(4401, "missing ticket");
      } catch (_) { }
      return;
    }
    if (!isWsBrowserOriginOk(request)) {
      safeSendJson(ws, { type: "error", code: "ORIGIN", message: "Origin not allowed" });
      try {
        ws.close(4403, "origin not allowed");
      } catch (_) { }
      return;
    }

    pendingAuthConnection(ws, request, ticketId);
  } catch (e) {
    logger.debug("[support-ws] connection setup failed", e.message);
    try {
      ws.close(1011, "server error");
    } catch (_) { }
  }
}

function initSupportChatWebSocket(httpServer) {
  const wss = new WebSocket.Server({ noServer: true, maxPayload: 16 * 1024 });

  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.__authenticated) return;
      if (ws.isAlive === false) {
        try {
          ws.terminate();
        } catch (_) { }
        return;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch (_) { }
    });
  }, HEARTBEAT_MS);

  httpServer.on("upgrade", (request, socket, head) => {
    try {
      const host = request.headers.host || "localhost";
      const u = new URL(request.url || "/", `http://${host}`);
      if (!u.pathname.startsWith("/api/ws/support")) return;
      wss.handleUpgrade(request, socket, head, (ws) => {
        onConnection(ws, request);
      });
    } catch (e) {
      try {
        socket.destroy();
      } catch (_) { }
    }
  });

  startRedisSubscriber().catch(() => { });

  return wss;
}

module.exports = { initSupportChatWebSocket, broadcastLocal, isUserConnectedToTicket };
