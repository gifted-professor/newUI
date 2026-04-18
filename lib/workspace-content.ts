export const workspaceMetrics = [
  {
    label: "待解析邮件",
    value: "128 封",
    hint: "过去 24 小时新增 36 封",
  },
  {
    label: "累计成功写入飞书",
    value: "46 条",
    hint: "最近 8 分钟更新过一次",
  },
  {
    label: "剩余可用算力",
    value: "1854 点",
    hint: "当前套餐可继续跑批量解析",
  },
  {
    label: "活跃队列",
    value: "03 条",
    hint: "2 条解析中，1 条等待启动",
  },
] as const;

export const workspaceStatusRail = [
  {
    label: "账户状态",
    value: "活跃",
    detail: "当前为体验版，可继续测试完整流程",
  },
  {
    label: "当前登录邮箱",
    value: "giftedprofessor6@gmail.com",
    detail: "只用于登录系统，不等于已连接收件箱",
  },
] as const;

export const feishuSetup = {
  title: "2. 复制并连接飞书模板",
  description: "先复制标准飞书模板，再填入飞书 Webhook。网页只负责把结果写进去，真正的业务处理在飞书里完成。",
  buttonLabel: "一键复制飞书标准模板",
  webhookLabel: "飞书 Webhook 链接",
  webhookPlaceholder: "请输入飞书多维表格 Webhook 链接",
  helper: "模板里已经预设好字段结构，方便后续自动写入。",
};

export const recentActivity = [
  "[2026-04-14 12:25] 成功提取 @Luna_xo 底线报价，已流转至飞书。",
  "[2026-04-14 12:26] 发现一封无意义广告邮件，已自动跳过，未扣除算力。",
  "[2026-04-14 12:27] 识别出最新一封回复时间，已写入线程时间轴。",
  "[2026-04-14 12:29] 解析 3 封 TikTok 合作邮件，生成当前报价与阶段摘要。",
  "[2026-04-14 12:31] 同步飞书成功，新增 6 条结构化记录。",
  "[2026-04-14 12:33] 自动跳过一封系统通知邮件，不计入算力。",
] as const;
