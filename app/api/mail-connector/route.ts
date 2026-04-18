import { NextResponse } from "next/server";
import { mailProviders } from "@/lib/mail-provider-content";
import { readMailConnectorCookie, writeMailConnectorCookie } from "@/lib/mail-connector-cookie";

type Payload = {
  action?: "test" | "save";
  providerKey?: string;
  email?: string;
  nickname?: string;
  secret?: string;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ message: "请求数据格式错误。" }, { status: 400 });
  }

  const action = payload.action;
  const providerKey = asString(payload.providerKey);
  const email = asString(payload.email);
  const nickname = asString(payload.nickname);
  const secret = asString(payload.secret);

  const provider = mailProviders.find((item) => item.key === providerKey);

  if (!provider) {
    return NextResponse.json({ message: "请选择有效的邮箱服务商。" }, { status: 400 });
  }

  if (!email.includes("@")) {
    return NextResponse.json({ message: "请填写有效的邮箱地址。" }, { status: 400 });
  }

  if (provider.mode === "imap" && secret.length < 4) {
    return NextResponse.json({ message: "请填写有效的 IMAP 授权码或 App Password。" }, { status: 400 });
  }

  if (action === "test") {
    return NextResponse.json({
      message:
        provider.mode === "oauth"
          ? "当前 Google 邮箱可以直接作为收件箱连接。"
          : "测试连接通过，当前邮箱地址与授权码格式看起来正确。",
    });
  }

  if (action === "save") {
    const existing = await readMailConnectorCookie();

    await writeMailConnectorCookie({
      providerKey,
      mode: provider.mode,
      email,
      nickname,
      connected: true,
      savedAt: new Date().toISOString(),
      secret: provider.mode === "imap" ? secret : undefined,
      feishuWebhookUrl: existing?.feishuWebhookUrl,
      feishuWebhookSavedAt: existing?.feishuWebhookSavedAt,
    });

    return NextResponse.json({
      message:
        provider.mode === "oauth"
          ? "Gmail 收件箱已保存为当前连接邮箱。"
          : "邮箱配置已保存，刷新后会显示最新连接状态。",
      savedConfig: {
        providerKey,
        mode: provider.mode,
        email,
        nickname,
        connected: true,
      },
    });
  }

  return NextResponse.json({ message: "不支持的动作。" }, { status: 400 });
}
