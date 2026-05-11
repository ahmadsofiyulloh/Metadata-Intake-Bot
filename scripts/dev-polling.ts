import fs from "node:fs/promises";
import path from "node:path";
import { getEnv } from "../src/config/env.js";
import { handleUpdate } from "../src/bot/handleUpdate.js";
import { fetchUpdates, fetchWebhookInfo } from "../src/bot/http";
import type { TelegramUpdate } from "../src/types/telegram.js";

const STATE_DIR = path.resolve(".data");
const OFFSET_FILE = path.join(STATE_DIR, "dev-polling-offset.json");

async function ensureStateDir(): Promise<void> {
  await fs.mkdir(STATE_DIR, { recursive: true });
}

async function loadOffset(): Promise<number> {
  try {
    const raw = await fs.readFile(OFFSET_FILE, "utf8");
    const parsed = JSON.parse(raw) as { offset?: number };
    return Number(parsed.offset ?? 0) || 0;
  } catch {
    return 0;
  }
}

async function saveOffset(offset: number): Promise<void> {
  await ensureStateDir();
  await fs.writeFile(OFFSET_FILE, JSON.stringify({ offset }, null, 2), "utf8");
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  getEnv();
  await ensureStateDir();

  const webhookInfo = await fetchWebhookInfo();
  if (webhookInfo.url) {
    console.error(
      `Webhook is active for this token (${webhookInfo.url}). Delete it first or use a dev bot token.`
    );
    process.exitCode = 1;
    return;
  }

  let offset = await loadOffset();
  console.log(`Polling started. Offset=${offset}`);

  while (true) {
    try {
      const updates = await fetchUpdates(offset, 30);
      if (updates.length === 0) {
        await sleep(1000);
        continue;
      }

      for (const update of updates as TelegramUpdate[]) {
        await handleUpdate(update);
        offset = update.update_id + 1;
        await saveOffset(offset);
      }
    } catch (error) {
      console.error("Polling error", {
        error: error instanceof Error ? error.message : String(error)
      });
      await sleep(5000);
    }
  }
}

main().catch((error) => {
  console.error("Polling process failed", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exitCode = 1;
});
