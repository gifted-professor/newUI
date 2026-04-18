export const heroContent = {
  eyebrow: "给出海团队的达人回信整理引擎",
  title: "把海外网红回信，直接变成可报价表",
  subtitle: "自动提取报价、底线与合作意向，5 分钟同步到飞书。",
  cta: "免费获取 200 封邮件解析额度",
  microTrust: ["OAuth 接入", "不存原始邮件", "飞书直达"],
};

export const beforeEmails = [
  {
    from: "Luna | @lunaskinlab",
    subject: "RE: collab rates / maybe package?",
    body: "Hey dear～ reel is 450 USD, but if usage is ads maybe need extra. Story maybe included if timeline easy. Can talk 😅",
    accent: "red",
  },
  {
    from: "Mateo Agency",
    subject: "报价和市场区分",
    body: "US market 和 LATAM 价格不一样。TikTok 首发 700，美区白名单另算，长期合作可以打包。",
    accent: "amber",
  },
  {
    from: "Nika creator team",
    subject: "last price",
    body: "Need clarify deliverables, timeline, exclusivity, link in bio, raw footage fee, maybe 1,200 EUR total?",
    accent: "red",
  },
];

export const afterRows = [
  {
    name: "Luna Skin Lab",
    handle: "@lunaskinlab",
    followers: "182K",
    quote: "$450",
    floor: "$380",
    score: "92",
    summary: "愿意打包 Story，档期宽松",
  },
  {
    name: "Mateo Agency",
    handle: "@mateogtm",
    followers: "310K",
    quote: "$700",
    floor: "$620",
    score: "81",
    summary: "美区单独计价，可谈长期",
  },
  {
    name: "Nika Creator",
    handle: "@nika.daily",
    followers: "96K",
    quote: "€1,200",
    floor: "€980",
    score: "74",
    summary: "需明确授权和素材费",
  },
  {
    name: "Ava Studio",
    handle: "@ava.tryon",
    followers: "540K",
    quote: "$1,900",
    floor: "$1,650",
    score: "88",
    summary: "高意向，适合测爆款",
  },
];

export const trustCards = [
  {
    title: "无密码接入",
    body: "支持 OAuth 或应用专属授权码，绝不索要您的邮箱原密码。",
    accent: "cyan",
  },
  {
    title: "单向水管，数据不落库",
    body: "AI 解析后即刻焚毁，您的网红商业机密只存在于您自己的飞书里。",
    accent: "green",
  },
  {
    title: "私有化交付",
    body: "无缝对接飞书，不需要员工学习新系统。",
    accent: "brand",
  },
] as const;

export const pricingCards = [
  {
    name: "POC 验证",
    price: "0 元",
    detail: "包含 200 点算力",
    note: "限新用户跑通跑透",
    highlighted: false,
  },
  {
    name: "企业基础版",
    price: "299 元 / 月",
    detail: "包含 2000 点核心解析算力",
    note: "飞书直连 / 适合固定团队持续跑单",
    highlighted: true,
  },
] as const;

export const pricingFootnote = "表格内可随时按需触发深度实时爬取，消耗额外点数。";

export const footerText = "让达人合作从邮件混乱，进入结构化成交。";
