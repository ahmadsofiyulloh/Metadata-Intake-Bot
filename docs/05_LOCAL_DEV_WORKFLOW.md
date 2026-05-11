# Local Development Workflow

## Goal

Local development harus cepat dan tidak perlu deploy ke Vercel setiap perubahan kecil.

Gunakan dua mode:

1. **Polling Mode** untuk development harian.
2. **Webhook Mode** untuk test produksi/Vercel.

## Recommended Local Dev: Polling Mode

### Flow

```text
Telegram Dev Bot
   ↓ getUpdates polling
scripts/dev-polling.ts
   ↓
src/bot/handleUpdate.ts
   ↓
Gemini + Supabase
   ↓
Telegram sendMessage
```

### Jalankan

```bash
npm install
npm run dev:polling
```

### Kelebihan

- Tidak perlu ngrok/tunnel.
- Tidak perlu deploy ke Vercel.
- Bisa debug cepat di terminal.
- Cocok untuk test `/new`, `/search`, `/shopee`, `/tiktok`.

### Catatan

Telegram bot tidak bisa polling dan webhook aktif bersamaan dengan token yang sama.

Sebelum polling, hapus webhook:

```bash
npm run delete:webhook
```

Lebih aman: pakai bot dev terpisah.

## Webhook Local Mode via Tunnel

Dipakai hanya jika ingin test path webhook seperti production.

### Flow

```text
Telegram → HTTPS tunnel → localhost:3000/api/telegram/webhook
```

### Jalankan Vercel Dev

```bash
npm run dev
```

atau langsung:

```bash
vercel dev
```

Buat tunnel dengan ngrok/cloudflared, lalu set webhook ke URL tunnel.

Contoh:

```bash
npm run set:webhook -- --url https://your-tunnel-url.ngrok-free.app/api/telegram/webhook
```

## Production-like Preview Mode

1. Deploy preview:

```bash
vercel deploy
```

2. Set webhook ke preview URL.
3. Test Telegram command.
4. Jika valid, deploy production:

```bash
vercel deploy --prod
```

## Recommended Dev Cycle

```text
1. Coding lokal
2. npm run typecheck
3. npm run dev:polling
4. Test via Telegram dev bot
5. Fix bugs
6. Deploy preview Vercel
7. Set webhook preview if needed
8. Deploy production
9. Set webhook production
```

## Testing Checklist Local

Test commands:

```text
/start
/new
/search kayu jati
/shopee kayu jati
/tiktok kayu jati
/review
/ready
```

Test input seller:

```text
Sembelih badik baja per kayu jati pb 25-26 lb 35 tb 4 ml stok 12 pcs 120.000
```

Expected behavior:

- Bot generates metadata.
- Data saved to Supabase.
- Output fields are copyable via inline code.
- Compliance status appears.
- Missing fields appear.
- Search returns the product by `kayu jati`.
