import { NextResponse } from "next/server";
import { readMailConnectorCookie, writeMailConnectorCookie } from "@/lib/mail-connector-cookie";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isLikelyFeishuWebhook(url: string) {
  return /^https:\/\/open\.feishu\.cn\/open-apis\/.+/.test(url);
}

export async function POST(request: Request) {
  let payload: { action?: "test" | "save"; webhook?: string };

  try {
    payload = (await request.json()) as { action?: "test" | "save"; webhook?: string };
  } catch {
    return NextResponse.json({ message: "请求数据格式错误。" }, { status: 400 });
  }

  const action = payload.action;
  const webhook = asString(payload.webhook);

  if (!webhook) {
    return NextResponse.json({ message: "请填写飞书 Webhook 链接。" }, { status: 400 });
  }

  if (!isLikelyFeishuWebhook(webhook)) {
    return NextResponse.json({ message: "Webhook 链接格式不正确，请检查飞书地址。" }, { status: 400 });
  }

  if (action === "test") {
    return NextResponse.json({ message: "Webhook 格式校验通过，可以保存到当前工作台。" });
  }

  if (action === "save") {
    const existing = (await readMailConnectorCookie()) ?? {
      providerKey: "",
      mode: "imap" as const,
      email: "",
      connected: false,
      savedAt: new Date().toISOString(),
    };

    await writeMailConnectorCookie({
      ...existing,
      feishuWebhookUrl: webhook,
      feishuWebhookSavedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      message: "飞书 Webhook 已保存，后续写入将优先使用这个地址。",
      savedWebhook: webhook,
    });
  }

  return NextResponse.json({ message: "不支持的动作。" }, { status: 400 });
}
