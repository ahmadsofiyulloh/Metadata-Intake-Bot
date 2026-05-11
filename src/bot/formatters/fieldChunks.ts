export function splitTextIntoChunks(
  text: string,
  maxLength = 700
): string[] {
  const normalized = text.trim();
  if (!normalized) {
    return [""];
  }

  if (normalized.length <= maxLength) {
    return [normalized];
  }

  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim());
  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    if (current.trim()) {
      chunks.push(current.trim());
      current = "";
    }
  };

  for (const paragraph of paragraphs) {
    if (!paragraph) {
      continue;
    }

    if (paragraph.length > maxLength) {
      flush();
      let start = 0;
      while (start < paragraph.length) {
        chunks.push(paragraph.slice(start, start + maxLength));
        start += maxLength;
      }
      continue;
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxLength) {
      flush();
      current = paragraph;
    } else {
      current = candidate;
    }
  }

  flush();
  return chunks;
}

export function splitValueForTelegram(
  label: string,
  value: string,
  maxLength = 700
): Array<{ label: string; value: string }> {
  return splitTextIntoChunks(value, maxLength).map((chunk, index) => ({
    label: `${label}${index + 1 > 1 ? ` ${index + 1}` : ""}`,
    value: chunk
  }));
}
