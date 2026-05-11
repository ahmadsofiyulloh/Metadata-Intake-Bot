import { getEnv, getPublicBaseUrl } from "../src/config/env.js";
import { configureWebhook } from "../src/bot/http";

function parseWebhookUrl(argv: string[]): string | null {
  const urlIndex = argv.findIndex((value) => value === "--url");
  if (urlIndex >= 0 && argv[urlIndex + 1]) {
    return argv[urlIndex + 1];
  }

  return null;
}

function buildWebhookUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/api/telegram/webhook")) {
    return trimmed;
  }
  return `${trimmed}/api/telegram/webhook`;
}

async function main(): Promise<void> {
  const env = getEnv();
  const cliUrl = parseWebhookUrl(process.argv.slice(2));
  const baseUrl = cliUrl ?? getPublicBaseUrl(env);

  if (!baseUrl) {
    throw new Error("Provide --url or set VERCEL_PUBLIC_URL / VERCEL_URL.");
  }

  const webhookUrl = buildWebhookUrl(baseUrl);
  await configureWebhook({
    url: webhookUrl,
    secretToken: env.TELEGRAM_WEBHOOK_SECRET
  });

  console.log(`Telegram webhook set to ${webhookUrl}`);
}

main().catch((error) => {
  console.error("Failed to set Telegram webhook", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exitCode = 1;
});
