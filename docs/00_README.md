# Metadata Intake Bot — Documentation Pack

Dokumen ini adalah paket handoff final untuk membuat **Telegram Product Metadata Bot** dengan AI Coding Agent/Codex CLI.

## Ringkasan Project

Project ini adalah bot Telegram backend-only untuk membantu input produk baru dari deskripsi seller/supplier. MVP hanya fokus pada **olah teks deskripsi seller** menjadi metadata produk siap copy.

Tidak ada frontend, tidak ada OCR foto, tidak ada edit foto, tidak ada sync marketplace, dan tidak ada tracking delivery pada fase MVP ini.

## Isi Paket Dokumen

| File | Fungsi |
|---|---|
| `01_PRD_FINAL.md` | PRD final project dan scope MVP |
| `02_MVP_SCOPE_LOCK.md` | Batasan scope agar Codex tidak melebar |
| `03_ARCHITECTURE.md` | Arsitektur backend-only Telegram Bot + Vercel + Supabase + Gemini |
| `04_INFRA_SETUP.md` | Checklist akun, key, environment, Vercel, Supabase, Telegram |
| `05_LOCAL_DEV_WORKFLOW.md` | Cara pengembangan lokal bot Telegram tanpa harus deploy terus ke Vercel |
| `06_DATABASE_SCHEMA.md` | Schema database Supabase MVP |
| `07_TELEGRAM_UX_AND_COMMANDS.md` | UX Telegram, command, dan format output copyable di chat |
| `08_METADATA_GENERATION_SPEC.md` | Spesifikasi parsing deskripsi seller dan output metadata |
| `09_COMPLIANCE_AND_WORDING_GUARD.md` | Guardrail bahasa aman, netral, dan tidak menyesatkan |
| `10_GEMINI_STRUCTURED_OUTPUT_SCHEMA.md` | Schema JSON output Gemini dan instruksi prompt |
| `11_CODEBASE_STRUCTURE.md` | Struktur repo target yang harus dibuat Codex |
| `12_EXECUTION_CHECKLIST.md` | Checklist eksekusi, test, deploy, dan validasi |
| `CODEX_SESSION_START_PROMPT.md` | Prompt pembuka sesi siap copy untuk Codex CLI |

## Cara Pakai

1. Extract zip ini.
2. Buka `CODEX_SESSION_START_PROMPT.md`.
3. Copy seluruh isi prompt ke Codex CLI sebagai prompt pembuka awal sesi.
4. Setelah Codex membuat repo, pakai dokumen lain sebagai rujukan audit hasil.

## Prinsip Penting

- Telegram chat hanya menjadi UI kerja cepat.
- Database menjadi source of truth.
- Search utama berbasis nama supplier dan nama toko yang sudah dinormalisasi, bukan SKU.
- SKU tetap dibuat sebagai ID internal dan field seller.
- Output copy memakai format teks monospace/inline-code per field, bukan tombol copy inline keyboard.
- Data seller tidak selalu lengkap; AI wajib membedakan explicit, inferred, unknown, dan risk.
- Compliance guard dipakai untuk normalisasi bahasa yang jujur dan aman, bukan untuk menyamarkan produk terlarang.
