import { code, escapeHtml, section } from "./formatters/telegramHtml.js";
import type { ManualFieldDefinition } from "../metadata/manualFields.js";

function formatMissingFieldList(fields: ManualFieldDefinition[]): string[] {
  return fields.map((field, index) => `${index + 1}. ${code(field.label)}`);
}

export function formatMissingFieldConfirmationMessage(
  shortCode: string,
  fields: ManualFieldDefinition[]
): string {
  return section("Konfirmasi data kosong", [
    `Draft: ${code(shortCode)}`,
    "",
    "Field yang masih kosong:",
    ...formatMissingFieldList(fields),
    "",
    `Balas ${code("lanjut")} untuk isi satu per satu atau ${code("skip")} untuk simpan apa adanya.`
  ]);
}
export function formatMissingFieldPromptMessage(
  field: ManualFieldDefinition,
  remainingCount: number
): string {
  return section(`Isi ${field.label}`, [
    escapeHtml(field.prompt),
    "",
    `Contoh: ${code(field.example)}`,
    remainingCount > 1
      ? `Masih ada ${code(String(remainingCount - 1))} field lain setelah ini.`
      : `Ini field terakhir yang masih kosong.`,
    "",
    `Ketik ${code("skip")} untuk melewati field ini.`
  ]);
}

export function formatMissingFieldSavedMessage(
  field: ManualFieldDefinition,
  remainingFields: ManualFieldDefinition[],
  shortCode: string
): string {
  return section("Field tersimpan", [
    `${code(field.label)} sudah diperbarui.`,
    "",
    remainingFields.length > 0
      ? `Sisa field: ${remainingFields.map((item) => code(item.label)).join(", ")}`
      : `Semua field untuk ${code(shortCode)} sudah diisi.`,
    "",
    remainingFields.length > 0
      ? `Lanjut isi field berikutnya.`
      : `Gunakan /detail ${code(shortCode)} untuk cek hasil akhirnya.`
  ]);
}

export function formatMissingFieldSkippedMessage(shortCode: string): string {
  return section("Pengisian dilewati", [
    `Draft ${code(shortCode)} disimpan apa adanya.`,
    "",
    `Gunakan /detail ${code(shortCode)} kapan saja untuk melihat ringkasan lengkap.`
  ]);
}

export function formatMissingFieldInvalidReplyMessage(
  shortCode: string,
  fields: ManualFieldDefinition[]
): string {
  return section("Konfirmasi diperlukan", [
    `Draft: ${code(shortCode)}`,
    "",
    `Balas ${code("lanjut")} untuk mulai isi field kosong atau ${code("skip")} untuk simpan apa adanya.`,
    "",
    `Field kosong saat ini: ${fields.map((field) => code(field.label)).join(", ")}`
  ]);
}
