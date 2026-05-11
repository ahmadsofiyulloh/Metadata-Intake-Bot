import { generateMetadata } from "../src/metadata/generateMetadata.js";

process.env.STORE_NAME ??= "LANDEP SMITH";
process.env.STORE_CODE ??= "LDS";
process.env.DEFAULT_LANGUAGE ??= "id";
process.env.GEMINI_MODEL ??= "gemini-2.5-flash";

const SAMPLE_TEXT =
  process.argv.slice(2).join(" ").trim() ||
  "Sembelih badik baja per kayu jati pb 25-26 lb 35 tb 16 stok 12 pcs 120.000";

async function main(): Promise<void> {
  const result = await generateMetadata(SAMPLE_TEXT);
  console.log(
    JSON.stringify(
      {
        aiUsed: result.aiUsed,
        draft: result.draft,
        shopee_field_pack_json: result.shopee_field_pack_json,
        tiktok_field_pack_json: result.tiktok_field_pack_json
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Gemini test failed", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exitCode = 1;
});
