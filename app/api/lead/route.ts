import { NextResponse } from "next/server";

type LeadPayload = {
  wechatId?: unknown;
  name?: unknown;
  company?: unknown;
  source?: unknown;
};

function asCleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let payload: LeadPayload;

  try {
    payload = (await request.json()) as LeadPayload;
  } catch {
    return NextResponse.json({ message: "提交数据格式不正确。" }, { status: 400 });
  }

  const wechatId = asCleanString(payload.wechatId);
  const name = asCleanString(payload.name);
  const company = asCleanString(payload.company);
  const source = asCleanString(payload.source) || "landing-modal";

  if (wechatId.length < 2) {
    return NextResponse.json({ message: "请填写有效的微信号。" }, { status: 400 });
  }

  const webhookUrl = process.env.FEISHU_WEBHOOK_URL;

  if (webhookUrl) {
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        msg_type: "text",
        content: {
          text: [
            "【海外网红邮件解析 - 新线索】",
            `微信号：${wechatId}`,
            name ? `姓名：${name}` : "",
            company ? `公司：${company}` : "",
            `来源：${source}`,
            `时间：${new Date().toISOString()}`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      }),
    });

    if (!webhookResponse.ok) {
      return NextResponse.json({ message: "线索已接收，但转发失败，请稍后检查 webhook 配置。" }, { status: 502 });
    }
  }

  return NextResponse.json({ message: "提交成功，我们会尽快通过微信联系你。" });
}
