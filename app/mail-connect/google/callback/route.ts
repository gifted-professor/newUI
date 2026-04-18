import { NextResponse } from "next/server";
import { readMailConnectorCookie, writeMailConnectorCookie } from "@/lib/mail-connector-cookie";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");

  if (!email) {
    return NextResponse.redirect(new URL("/workspace", url.origin));
  }

  const existing = await readMailConnectorCookie();

  await writeMailConnectorCookie({
    providerKey: "gmail-oauth",
    mode: "oauth",
    email,
    nickname: existing?.nickname,
    connected: true,
    savedAt: new Date().toISOString(),
    secret: undefined,
    feishuWebhookUrl: existing?.feishuWebhookUrl,
    feishuWebhookSavedAt: existing?.feishuWebhookSavedAt,
  });

  return NextResponse.redirect(new URL("/workspace", url.origin));
}
