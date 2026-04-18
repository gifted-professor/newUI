export const mailProviders = [
  {
    key: "gmail-oauth",
    label: "Gmail（Google 官方授权）",
    mode: "oauth",
    helpUrl: null,
    hint: "使用 Google 官方授权连接，无需填写 IMAP 授权码。",
  },
  {
    key: "qq",
    label: "QQ 邮箱（需要授权码）",
    mode: "imap",
    helpUrl: "https://help.scrumball.cn/docs/QQ-you-xiang",
    hint: "请填写邮箱地址和 IMAP/授权码，不使用登录密码。",
  },
  {
    key: "tencent-work",
    label: "腾讯企业邮（需要授权码）",
    mode: "imap",
    helpUrl: "https://help.scrumball.cn/docs/rYhYDj",
    hint: "企业邮建议用公共合作邮箱接入，便于统一收件。",
  },
  {
    key: "feishu-mail",
    label: "飞书邮箱（需要授权码）",
    mode: "imap",
    helpUrl: "https://help.scrumball.cn/docs/fei-shu-you-xiang",
    hint: "先开通 IMAP，再填写邮箱地址和授权码。",
  },
  {
    key: "lark-mail",
    label: "Lark 邮箱（需要授权码）",
    mode: "imap",
    helpUrl: "https://help.scrumball.cn/docs/ybBxFE",
    hint: "适合国际团队邮箱，授权后即可统一抓取询盘。",
  },
  {
    key: "aliyun-enterprise",
    label: "阿里云企业邮箱（需要授权码）",
    mode: "imap",
    helpUrl: "https://help.scrumball.cn/docs/B7VVR6",
    hint: "建议先按教程开启 IMAP / 客户端授权。",
  },
  {
    key: "outlook",
    label: "Outlook / Microsoft 365",
    mode: "imap",
    helpUrl: "https://help.scrumball.cn/docs/otzvyC",
    hint: "如果未接 OAuth，先按教程生成应用密码或开启 IMAP。",
  },
  {
    key: "other-imap",
    label: "其他 IMAP 邮箱",
    mode: "imap",
    helpUrl: "https://help.scrumball.cn/docs/nD2FcY",
    hint: "请确认服务商已开启 IMAP，并准备授权码或 App Password。",
  },
] as const;

export type MailProvider = (typeof mailProviders)[number];
