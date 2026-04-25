import { timingSafeEqual } from "node:crypto";

const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];
const DEFAULT_JSON_BODY_LIMIT_BYTES = 1024 * 1024;

function getAllowedOrigins() {
  const raw = process.env.LOCAL_CONNECTOR_ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(",");
  return new Set(
    raw
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function getBearerToken(req) {
  const authorization = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization || "";
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }
  const token = req.headers["x-local-connector-token"];
  return Array.isArray(token) ? token[0] : token || "";
}

function safeTokenEquals(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isOriginAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  return getAllowedOrigins().has(origin);
}

export function applyCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (!origin) return;

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Local-Connector-Token");

  if (req.headers["access-control-request-private-network"] === "true") {
    res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
}

export function isAuthorized(req, pathname) {
  if (pathname === "/v1/health") return true;

  const expectedToken = process.env.LOCAL_CONNECTOR_TOKEN || "";
  if (!expectedToken) return true;

  return safeTokenEquals(getBearerToken(req), expectedToken);
}

export function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

export async function parseJsonBody(req, { maxBytes = DEFAULT_JSON_BODY_LIMIT_BYTES } = {}) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > maxBytes) {
      throw new Error("请求体过大。");
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
