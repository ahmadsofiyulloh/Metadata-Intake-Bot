import { removeWebhook } from "../src/bot/http";

async function main(): Promise<void> {
  await removeWebhook();
  console.log("Telegram webhook deleted.");
}

main().catch((error) => {
  console.error("Failed to delete Telegram webhook", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exitCode = 1;
});
