export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function code(value: string): string {
  return `<code>${escapeHtml(value)}</code>`;
}

export function line(label: string, value: string): string {
  return `${escapeHtml(label)}:\n${code(value)}`;
}

export function section(title: string, body: string[]): string {
  return [escapeHtml(title), ...body].join("\n\n");
}
