import type { ParsedBody } from "@/lib/server/historical-parse/extract-full-body";

const PLATFORM_PATTERNS = [
  { platform: "Instagram", patterns: [/instagram/gi, /ig\b/gi, /reels?/gi] },
  { platform: "TikTok", patterns: [/tiktok/gi, /tt\b/gi] },
  { platform: "YouTube", patterns: [/youtube/gi, /yt\b/gi, /shorts/gi, /long form/gi] },
  { platform: "X", patterns: [/(^|\W)twitter(\W|$)/gi, /\bx\b/gi] },
  { platform: "Amazon", patterns: [/amazon/gi] },
  { platform: "Shopify", patterns: [/shopify/gi] },
];
const PRICE_PATTERNS = [
  { currency: "USD", regex: /(?:\$|usd\s?)(\d{2,6}(?:[.,]\d{1,2})?)/i },
  { currency: "EUR", regex: /(?:€|eur\s?)(\d{2,6}(?:[.,]\d{1,2})?)/i },
  { currency: "GBP", regex: /(?:£|gbp\s?)(\d{2,6}(?:[.,]\d{1,2})?)/i },
  { currency: "CNY", regex: /(?:¥|rmb\s?|cny\s?)(\d{2,6}(?:[.,]\d{1,2})?)/i },
];
const PRICE_CONTEXT_PATTERNS = [/rate/i, /rate card/i, /my rate/i, /our rate/i, /price/i, /pricing/i, /quote/i, /quotation/i, /budget/i, /ballpark/i, /charges/i, /offer confirmation/i, /报价/, /预算/];
const STAGE_PATTERNS = [
  { stage: "报价中", patterns: [/rate card/i, /quote/i, /quotation/i, /报价/, /price/i, /ballpark rate/i, /my rate/i, /charges/i] },
  { stage: "待回复", patterns: [/follow up/i, /checking in/i, /just following up/i, /haven[’']t heard back/i, /跟进/] },
  { stage: "合作确认", patterns: [/confirmed/i, /let'?s move forward/i, /deal/i, /offer confirmation/i, /happy to confirm/i, /合作确认/] },
  { stage: "初次触达", patterns: [/collab/i, /partnership/i, /campaign/i, /合作机会/, /collaboration overview/i] },
];
const INTENT_PATTERNS = [
  { intent: "give_quote", patterns: [/my rate/i, /our rate/i, /charges/i, /the price/i, /my fee/i, /the rate would be/i, /我报价/] },
  { intent: "ask_quote", patterns: [/share your ballpark rate/i, /what amount/i, /let us know your rate/i, /please share your rate/i, /报价多少/, /请报价/] },
  { intent: "negotiate", patterns: [/wiggle room/i, /would there be any room/i, /could you do/i, /we'?d like to propose/i, /can you lower/i, /议价/] },
  { intent: "follow_up", patterns: [/follow up/i, /just checking in/i, /haven[’']t heard back/i, /checking in/i, /跟进/] },
  { intent: "accept", patterns: [/happy to move forward/i, /sounds good/i, /let'?s proceed/i, /i'?m totally agree/i, /接受合作/] },
  { intent: "reject", patterns: [/not interested/i, /pass on this/i, /decline/i, /不考虑/] },
] as const;
const INTERNAL_DOMAIN_PATTERNS = [/@amagency\.biz$/i, /@aquamind/i, /@noxinfluencer/i, /@alibaba\.com$/i];
const BAD_CREATOR_VALUES = new Set(["dear", "miniso", "skg", "duet", "eden", "yvette", "astrid", "adelaide"]);
const GENERIC_LOCAL_PART_PATTERNS = [/collab/i, /partnership/i, /team/i, /info/i, /contact/i, /talent/i, /mgmt/i, /management/i, /agency/i, /social/i];
const DOMAIN_LIKE_PATTERNS = /\.(com|biz|net|org|co|ai|io|de|fr|es|us|uk|cn)$/i;

function normalizeWhitespace(value: string) {
  return String(value || "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
function buildSummary(fullBody: string) {
  return normalizeWhitespace(fullBody).replace(/\n/g, " ").slice(0, 240);
}
function detectPlatform(subject: string, body: string) {
  const source = `${subject}\n${body}`;
  const matches = PLATFORM_PATTERNS.map((item) => ({ platform: item.platform, score: item.patterns.reduce((count, pattern) => count + ((source.match(pattern) || []).length > 0 ? 1 : 0), 0) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return matches[0]?.platform ?? null;
}
function detectQuotedPrice(fullBody: string) {
  const lines = fullBody.split("\n").slice(0, 60);
  for (const line of lines) {
    const normalizedLine = line.trim();
    if (!normalizedLine) continue;
    if (!PRICE_CONTEXT_PATTERNS.some((pattern) => pattern.test(normalizedLine))) continue;
    for (const candidate of PRICE_PATTERNS) {
      const match = normalizedLine.match(candidate.regex);
      if (!match) continue;
      const amount = Number(match[1].replace(/,/g, ""));
      if (!Number.isFinite(amount) || amount < 30) continue;
      return { amount, currency: candidate.currency, raw: match[0] };
    }
  }
  return null;
}
function detectIntent(body: string, quotedPrice: { amount: number; currency: string; raw: string } | null) {
  if (quotedPrice) return "give_quote";
  for (const candidate of INTENT_PATTERNS) {
    if (candidate.patterns.some((pattern) => pattern.test(body))) return candidate.intent;
  }
  return "unknown";
}
function detectStage(subject: string, body: string, quotedPrice: { amount: number; currency: string; raw: string } | null, intent: string) {
  const source = `${subject}\n${body}`;
  if (quotedPrice || intent === "give_quote") return "报价中";
  if (intent === "accept") return "合作确认";
  if (intent === "follow_up") return "待回复";
  if (intent === "ask_quote" || intent === "negotiate") return "报价中";
  if (intent === "reject") return "已拒绝";
  for (const candidate of STAGE_PATTERNS) {
    if (candidate.patterns.some((pattern) => pattern.test(source))) return candidate.stage;
  }
  return "待人工判断";
}
function extractGreetingCandidate(fullBody: string) {
  const greetingMatch = fullBody.match(/^(?:hi|hello|dear)\s+([^,\n]{2,80})/i);
  if (!greetingMatch) return null;
  const candidate = greetingMatch[1].trim();
  if (!candidate || /\b(team|there|friend|creator)\b/i.test(candidate)) return null;
  return candidate;
}
function isInternalAddress(address: string | null) {
  return INTERNAL_DOMAIN_PATTERNS.some((pattern) => pattern.test(address || ""));
}
function getLocalPart(address: string | null) {
  const value = String(address || "").trim().toLowerCase();
  if (!value.includes("@")) return "";
  return value.split("@")[0];
}
function normalizeCreatorCandidate(value: string | null) {
  if (!value) return null;
  const cleaned = value.replace(/^@/, "").trim();
  if (!cleaned) return null;
  if (BAD_CREATOR_VALUES.has(cleaned.toLowerCase())) return null;
  if (DOMAIN_LIKE_PATTERNS.test(cleaned)) return null;
  if (GENERIC_LOCAL_PART_PATTERNS.some((pattern) => pattern.test(cleaned))) return null;
  if (/[<>]/.test(cleaned) || /\s{2,}/.test(cleaned)) return null;
  if (/^[a-z0-9._]{3,}$/i.test(cleaned)) return cleaned;
  return null;
}
function detectCreatorId(subject: string, from: string, to: string, fullBody: string, fromAddress: string | null, toAddress: string | null) {
  const fromLocal = normalizeCreatorCandidate(getLocalPart(fromAddress));
  const toLocal = normalizeCreatorCandidate(getLocalPart(toAddress));
  if (fromAddress && !isInternalAddress(fromAddress) && fromLocal) return fromLocal;
  if (fromAddress && isInternalAddress(fromAddress) && toAddress && !isInternalAddress(toAddress) && toLocal) return toLocal;
  const sources = `${subject}\n${from}\n${to}\n${fullBody}`;
  const handleMatches = sources.match(/@[a-z0-9._]{3,}/gi) || [];
  const normalizedHandles = [...new Set(handleMatches.map((item) => normalizeCreatorCandidate(item)).filter(Boolean))];
  if (normalizedHandles.length === 1) return normalizedHandles[0] || null;
  const greeting = normalizeCreatorCandidate(extractGreetingCandidate(fullBody));
  if (greeting && fromAddress && isInternalAddress(fromAddress)) return greeting;
  return null;
}

export type ExtractedFields = {
  creatorId: string | null;
  platform: string | null;
  quotedPrice: { amount: number; currency: string; raw: string } | null;
  latestReplyAt: string | null;
  stage: string;
  intent: string;
  summary: string;
  needsManualReview: boolean;
};

export function extractCoreFields(parsedBody: ParsedBody): ExtractedFields {
  const subject = parsedBody.subject || "";
  const analysisBody = parsedBody.currentBody || parsedBody.fullBody || "";
  const from = parsedBody.from || "";
  const to = parsedBody.to || "";
  const platform = detectPlatform(subject, analysisBody);
  const quotedPrice = detectQuotedPrice(analysisBody);
  const intent = detectIntent(analysisBody, quotedPrice);
  const creatorId = detectCreatorId(subject, from, to, analysisBody, parsedBody.fromAddress, parsedBody.toAddress);
  const stage = detectStage(subject, analysisBody, quotedPrice, intent);
  const summary = buildSummary(analysisBody);
  const needsManualReview = !platform || !quotedPrice || !creatorId;
  return { creatorId, platform, quotedPrice, latestReplyAt: parsedBody.date || null, stage, intent, summary, needsManualReview };
}
