import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { SavedMailConfig } from "@/types/mail-connector";

const COOKIE_NAME = "mail_connector_config";

function getSecretKey() {
  const secret = process.env.MAIL_CONNECTOR_SECRET || process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("Missing MAIL_CONNECTOR_SECRET or AUTH_SECRET.");
  }

  return createHash("sha256").update(secret).digest();
}

function encrypt(value: string) {
  const iv = randomBytes(12);
  const key = getSecretKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decrypt(payload: string) {
  const buffer = Buffer.from(payload, "base64url");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getSecretKey(), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export async function readMailConnectorCookie(): Promise<SavedMailConfig | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;

  if (!raw) return null;

  try {
    return JSON.parse(decrypt(raw)) as SavedMailConfig;
  } catch {
    return null;
  }
}

export async function writeMailConnectorCookie(config: SavedMailConfig) {
  const store = await cookies();
  store.set(COOKIE_NAME, encrypt(JSON.stringify(config)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
