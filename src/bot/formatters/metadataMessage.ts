import type { GeneratedMetadata, ProductDraftRow } from "../../types/metadata.js";
import { code, escapeHtml, line, section } from "./telegramHtml.js";
import { splitTextIntoChunks, splitValueForTelegram } from "./fieldChunks.js";
import { buildSellingPriceBreakdown, formatPriceNumber } from "../../metadata/priceEstimator.js";

function joinValues(values: string[]): string {
  return values.filter(Boolean).join(", ") || "-";
}

function formatSpecLabel(key: string): string {
  const knownLabels: Record<string, string> = {
    material: "Material",
    handle_material: "Gagang",
    pb: "Panjang Bilah",
    lb: "Lebar Bilah",
    tb: "Tinggi Bilah",
    supplier_price: "Harga Supplier",
    supplier_stock: "Stok Supplier",
    package_weight: "Berat Produk",
    package_dimensions: "Dimensi Paket",
    package_contents: "Isi Paket"
  };

  if (knownLabels[key]) {
    return knownLabels[key];
  }

  return key
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function formatSpecSummary(specs: GeneratedMetadata["specs"]): string {
  return Object.entries(specs)
    .map(([key, entry]) => `${formatSpecLabel(key)}: ${entry.value ?? "-"}`)
    .join(" | ");
}

function formatSpecCopyFieldBlock(field: GeneratedMetadata["image_metadata"]["spec_copy_fields"][number]): string {
  return section(field.label, [
    line("Nilai", field.copy_value),
    line("Label + Nilai", field.copy_label_value)
  ]);
}

function formatSpecCopyFields(imageMetadata: GeneratedMetadata["image_metadata"]): string {
  const fields = imageMetadata.spec_copy_fields ?? [];
  if (fields.length === 0) {
    return "-";
  }

  return fields.map((field) => formatSpecCopyFieldBlock(field)).join("\n\n");
}

function formatEstimatedSellingPriceSummary(supplierPrice: number | null): string {
  const breakdown = buildSellingPriceBreakdown(supplierPrice);
  return line(
    "Estimasi Harga Jual",
    breakdown ? formatPriceNumber(breakdown.estimatedSellingPrice) : "-"
  );
}

function formatEstimatedSellingPriceBreakdown(supplierPrice: number | null): string {
  const breakdown = buildSellingPriceBreakdown(supplierPrice);
  if (!breakdown) {
    return section("Estimasi Harga Jual", [
      line("Modal Supplier", "-"),
      line("Fee Marketplace (25%)", "-"),
      line("Keuntungan (25%)", "-"),
      line("Estimasi Total", "-")
    ]);
  }

  return section("Estimasi Harga Jual", [
    line("Modal Supplier", formatPriceNumber(breakdown.supplierPrice)),
    line("Fee Marketplace (25%)", formatPriceNumber(breakdown.marketplaceFee)),
    line("Keuntungan (25%)", formatPriceNumber(breakdown.profit)),
    line("Estimasi Total", formatPriceNumber(breakdown.estimatedSellingPrice))
  ]);
}

function getEstimatedSellingPriceValue(supplierPrice: number | null): string {
  const breakdown = buildSellingPriceBreakdown(supplierPrice);
  return breakdown ? formatPriceNumber(breakdown.estimatedSellingPrice) : "-";
}

export function formatWelcomeMessage(): string {
  return [
    "Metadata Intake Bot",
    "",
    "Pilih tombol di bawah untuk alur inti:",
    "Input Baru, Cari, Review, Siap Pakai, atau Bantuan.",
    "",
    "Aksi turunan seperti Detail, Shopee, TikTok, dan Arsipkan muncul sebagai tombol inline di pesan hasil.",
    "",
    "Fallback command tetap didukung:",
    "/start",
    "/new",
    `/search ${code("keyword")}`,
    `/detail ${code("short_code")}`,
    "/review",
    "/ready"
  ].join("\n");
}

export function formatNewDraftMessage(draft: ProductDraftRow): string[] {
  const rows = [
    "METADATA PRODUK BARU",
    "",
    line("Short Code", draft.short_code),
    "",
    line("Status Data", draft.data_status),
    "",
    line("Compliance", draft.compliance_status),
    "",
    line("Nama Supplier", draft.supplier_name || "-"),
    "",
    line("Nama Produk Supplier", draft.supplier_product_name || "-"),
    "",
    line("Nama Toko", draft.title_internal || "-"),
    "",
    line("SKU", draft.sku_internal || "-"),
    "",
    line("Modal Supplier", draft.supplier_price?.toString() ?? "-"),
    "",
    formatEstimatedSellingPriceSummary(draft.supplier_price),
    "",
    line("Stok Supplier", draft.supplier_stock?.toString() ?? "-"),
    "",
    line("Spesifikasi", formatSpecSummary(draft.specs)),
    "",
    "Copy Spek Foto",
    "",
    formatSpecCopyFields(draft.image_metadata),
    "",
    line("Data Kurang", joinValues(draft.missing_fields)),
    "",
    line("Catatan Review", draft.review_notes || "-")
  ].join("\n");

  return splitTextIntoChunks(rows, 3500);
}

export function formatDetailMessage(draft: ProductDraftRow): string {
  return [
    "DETAIL PRODUK",
    "",
    line("Short Code", draft.short_code),
    "",
    line("Nama Supplier", draft.supplier_name || "-"),
    "",
    line("Nama Produk Supplier", draft.supplier_product_name || "-"),
    "",
    line("Nama Toko", draft.title_internal || "-"),
    "",
    line("SKU", draft.sku_internal || "-"),
    "",
    line("Harga Supplier", draft.supplier_price?.toString() ?? "-"),
    "",
    formatEstimatedSellingPriceBreakdown(draft.supplier_price),
    "",
    line("Stok Supplier", draft.supplier_stock?.toString() ?? "-"),
    "",
    line("Compliance", draft.compliance_status),
    "",
    line("Status Data", draft.data_status),
    "",
    line("Keywords Shopee", joinValues(draft.keywords_shopee)),
    "",
    line("Keywords TikTok", joinValues(draft.keywords_tiktok)),
    "",
    line("Spesifikasi", formatSpecSummary(draft.specs)),
    "",
    "Copy Spek Foto",
    "",
    formatSpecCopyFields(draft.image_metadata),
    "",
    line("Data Kurang", joinValues(draft.missing_fields)),
    "",
    line("Catatan Review", draft.review_notes || "-")
  ].join("\n");
}

export function formatRawSellerTextMessages(rawSellerText: string): string[] {
  return splitValueForTelegram("Deskripsi Mentah Supplier", rawSellerText, 2400).map(
    ({ label, value }) => section(label, [code(value)])
  );
}

export function formatSearchResultsMessage(
  query: string,
  drafts: ProductDraftRow[]
): string {
  if (drafts.length === 0) {
    return `Hasil pencarian untuk ${escapeHtml(query)} tidak ditemukan.`;
  }

  const body = drafts
    .map((draft, index) => {
      return [
        `${index + 1}. ${code(draft.short_code)}`,
        code(draft.title_internal || "-"),
        `Nama Produk Supplier: ${code(draft.supplier_product_name || "-")}`,
        `Status: ${code(draft.compliance_status)}`,
        `Estimasi Jual: ${code(getEstimatedSellingPriceValue(draft.supplier_price))}`
      ].join("\n");
    })
    .join("\n\n");

  return section(`Hasil Pencarian: ${escapeHtml(query)}`, [
    body,
    `Buka detail: /detail ${code("short_code")}`
  ]);
}

export function formatSelectionMessage(
  platform: "shopee" | "tiktok",
  drafts: ProductDraftRow[]
): string {
  const rows = drafts
    .map((draft, index) => {
      return [
        `${index + 1}. ${code(draft.short_code)} - ${code(draft.title_internal || "-")}`,
        `Estimasi Jual: ${code(getEstimatedSellingPriceValue(draft.supplier_price))}`
      ].join("\n");
    })
    .join("\n");

  return [
    `Pilih produk untuk ${platform === "shopee" ? "Shopee" : "TikTok"} field pack:`,
    "",
    rows,
    "",
    `Ketik /detail ${code("short_code")} atau /${platform} ${code("short_code")}`
  ].join("\n");
}

export function formatReviewListMessage(
  title: string,
  drafts: ProductDraftRow[]
): string {
  if (drafts.length === 0) {
    return `${title}\n\nTidak ada data yang cocok.`;
  }

  const body = drafts
    .map((draft, index) => {
      return [
        `${index + 1}. ${code(draft.short_code)}`,
        code(draft.title_internal || "-"),
        `Compliance: ${code(draft.compliance_status)}`,
        `Status: ${code(draft.data_status)}`,
        `Estimasi Jual: ${code(getEstimatedSellingPriceValue(draft.supplier_price))}`
      ].join("\n");
    })
    .join("\n\n");

  return [title, "", body].join("\n");
}

function formatPlatformPack(
  draft: ProductDraftRow,
  platform: "shopee" | "tiktok"
): string {
  const platformPack =
    platform === "shopee"
      ? draft.shopee_field_pack_json
      : draft.tiktok_field_pack_json;
  const descriptionParts = Array.isArray(platformPack?.description_parts)
    ? (platformPack.description_parts as string[])
    : platform === "shopee"
      ? draft.shopee_description_parts
      : draft.tiktok_description_parts;

  const keywordList = platformPack?.keywords
    ? (platformPack.keywords as string[])
    : platform === "shopee"
      ? draft.keywords_shopee
      : draft.keywords_tiktok;

  const warning = platformPack?.warning
    ? String(platformPack.warning)
    : draft.review_notes || "-";

  const status = platformPack?.status ? String(platformPack.status) : draft.compliance_status;
  const purpose = platformPack?.purpose ? String(platformPack.purpose) : "MARKETPLACE_DRAFT";
  const title = platformPack?.title ? String(platformPack.title) : draft.title_internal || "-";
  const specCopyFields = Array.isArray(platformPack?.spec_copy_fields)
    ? formatSpecCopyFields({
        ...draft.image_metadata,
        spec_copy_fields: platformPack.spec_copy_fields
      })
    : formatSpecCopyFields(draft.image_metadata);

  const fieldLines = [
    line("Purpose", purpose),
    "",
    line("Nama Produk", title),
    "",
    line("SKU Seller", draft.sku_internal || "-"),
    "",
    formatEstimatedSellingPriceBreakdown(draft.supplier_price),
    "",
    line(platform === "shopee" ? "Keyword Shopee" : "Keyword TikTok", joinValues(keywordList)),
    "",
    line("Spesifikasi", formatSpecSummary(draft.specs)),
    "",
    "Copy Spek Foto",
    "",
    specCopyFields,
    "",
    line("Compliance", status),
    "",
    line("Catatan Review", warning)
  ];

  const descriptionFieldName = platform === "shopee" ? "Deskripsi Shopee" : "Deskripsi TikTok";
  descriptionParts.forEach((part, index) => {
    fieldLines.push("");
    fieldLines.push(line(`${descriptionFieldName} ${index + 1}`, part));
  });

  return [platform === "shopee" ? "SHOPEE FIELD PACK" : "TIKTOK FIELD PACK", "", ...fieldLines].join("\n");
}

export function formatShopeePackMessage(draft: ProductDraftRow): string {
  return formatPlatformPack(draft, "shopee");
}

export function formatTiktokPackMessage(draft: ProductDraftRow): string {
  return formatPlatformPack(draft, "tiktok");
}

export function formatArchiveMessage(shortCode: string): string {
  return `Draft ${code(shortCode)} telah diarsipkan.`;
}
