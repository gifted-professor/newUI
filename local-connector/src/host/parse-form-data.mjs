export async function parseMultipartFormData(req) {
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(?:(?:"([^"]+)")|([^;]+))/i);
  const boundary = boundaryMatch?.[1] || boundaryMatch?.[2];
  if (!boundary) {
    throw new Error("仅支持 multipart/form-data 上传。");
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const delimiter = Buffer.from(`--${boundary}`);
  const parts = [];
  let offset = 0;

  while (offset < body.length) {
    const start = body.indexOf(delimiter, offset);
    if (start === -1) break;
    const nextStart = body.indexOf(delimiter, start + delimiter.length);
    const end = nextStart === -1 ? body.length : nextStart;
    const rawPart = body.subarray(start + delimiter.length, end);
    offset = end;

    if (!rawPart.length) continue;
    const trimmed = rawPart.subarray(rawPart[0] === 13 && rawPart[1] === 10 ? 2 : 0);
    if (trimmed.length >= 2 && trimmed[0] === 45 && trimmed[1] === 45) break;

    const headerEnd = trimmed.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) continue;

    const headerText = trimmed.subarray(0, headerEnd).toString("utf8");
    let content = trimmed.subarray(headerEnd + 4);
    if (content.length >= 2 && content[content.length - 2] === 13 && content[content.length - 1] === 10) {
      content = content.subarray(0, content.length - 2);
    }

    const disposition = headerText.match(/name="([^"]+)"(?:;\s*filename="([^"]+)")?/i);
    if (!disposition) continue;

    parts.push({
      name: disposition[1],
      fileName: disposition[2] || null,
      value: disposition[2] ? content : content.toString("utf8"),
    });
  }

  return {
    get(name) {
      const part = parts.find((entry) => entry.name === name);
      return part ? part.value : null;
    },
    getFile(name) {
      const part = parts.find((entry) => entry.name === name && entry.fileName);
      if (!part) return null;
      return { fileName: part.fileName, bytes: part.value };
    },
  };
}
