import { simpleParser } from "mailparser";

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripHtmlTags(value) {
  return String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
}

function removeQuotedBlocks(value) {
  const markers = [
    /^on .+wrote:$/i,
    /^from:\s.+$/i,
    /^sent:\s.+$/i,
    /^to:\s.+$/i,
    /^subject:\s.+$/i,
    /^发件人[:：].+$/i,
    /^发送时间[:：].+$/i,
    /^收件人[:：].+$/i,
    /^主题[:：].+$/i,
  ];

  const lines = String(value || "").split("\n");
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(">")) continue;
    if (markers.some((pattern) => pattern.test(trimmed))) break;
    result.push(line);
  }

  return result.join("\n");
}

function removeNoise(value) {
  return String(value || "")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\[(image|cid):[^\]]+\]/gi, " ")
    .replace(/_{5,}/g, " ")
    .replace(/-{5,}/g, " ");
}

function cleanTextBody(value) {
  return normalizeWhitespace(removeNoise(removeQuotedBlocks(value)));
}

function chooseFullBody(parsed) {
  const text = cleanTextBody(parsed.text || "");
  if (text) {
    return {
      text,
      html: normalizeWhitespace(parsed.html || ""),
      fullBody: text,
    };
  }

  const htmlAsText = cleanTextBody(stripHtmlTags(parsed.html || ""));
  if (htmlAsText) {
    return {
      text: htmlAsText,
      html: normalizeWhitespace(parsed.html || ""),
      fullBody: htmlAsText,
    };
  }

  const textAsHtml = cleanTextBody(stripHtmlTags(parsed.textAsHtml || ""));
  return {
    text: textAsHtml,
    html: normalizeWhitespace(parsed.html || ""),
    fullBody: textAsHtml,
  };
}

function stripSignature(value) {
  const lines = String(value || "").split("\n");
  const signoffPattern = /^(cheers|best regards|kind regards|regards|sincerely|thanks)[,!.\s]*$/i;
  let end = lines.length;

  while (end > 0) {
    const trimmed = lines[end - 1].trim();
    if (!trimmed || /^\[invite id#[^\]]+\]$/i.test(trimmed) || /^unsubscribe$/i.test(trimmed)) {
      end -= 1;
      continue;
    }
    break;
  }

  for (let index = end - 1; index >= Math.max(0, end - 6); index -= 1) {
    if (signoffPattern.test(lines[index].trim())) {
      end = index;
      break;
    }
  }

  return lines.slice(0, end).join("\n");
}

function extractCurrentBody(fullBody) {
  const base = normalizeWhitespace(stripSignature(fullBody));
  const lines = base.split("\n");
  const hardStopMarkers = [
    /^on .+wrote:$/i,
    /^from:\s.+$/i,
    /^sent:\s.+$/i,
    /^to:\s.+$/i,
    /^subject:\s.+$/i,
    /^发件人[:：].+$/i,
    /^发送时间[:：].+$/i,
    /^收件人[:：].+$/i,
    /^主题[:：].+$/i,
  ];

  const currentLines = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (hardStopMarkers.some((pattern) => pattern.test(trimmed))) break;
    currentLines.push(line);
  }

  const currentBody = normalizeWhitespace(currentLines.join("\n"));
  if (base.length > 200 && currentBody.length < 40) {
    return base;
  }
  return currentBody || base;
}

function buildSnippet(value) {
  return normalizeWhitespace(value).slice(0, 280);
}

export async function extractFullBody(rawBuffer) {
  const parsed = await simpleParser(rawBuffer, {
    skipImageLinks: true,
  });

  const { text, html, fullBody } = chooseFullBody(parsed);
  const currentBody = extractCurrentBody(fullBody);

  return {
    subject: parsed.subject || "",
    messageId: parsed.messageId || null,
    inReplyTo: parsed.inReplyTo || null,
    references: parsed.references || null,
    date: parsed.date ? new Date(parsed.date).toISOString() : null,
    from: parsed.from?.text || "",
    to: parsed.to?.text || "",
    fromAddress: parsed.from?.value?.[0]?.address || null,
    toAddress: parsed.to?.value?.[0]?.address || null,
    text,
    html,
    fullBody,
    currentBody,
    snippet: buildSnippet(currentBody || fullBody),
    hasAttachments: Array.isArray(parsed.attachments) && parsed.attachments.length > 0,
    attachmentCount: Array.isArray(parsed.attachments) ? parsed.attachments.length : 0,
  };
}
