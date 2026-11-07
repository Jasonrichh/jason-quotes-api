# Jason Quotes API — API berbayar untuk quest vAPI "List your API" (500 pts)

API kecil yang menjual **satu quote acak per panggilan, harga 0,005 USDC**,
dibayar lewat x402 di Base. Dibuat mengikuti contoh resmi vAPI
(docs.vapinetwork.ai/call/sell-on-call/list-your-api).

## Yang kamu butuhkan

- Node.js (kamu sudah punya v26) + npm
- Alamat wallet kamu yang lengkap (yang di header vAPI tertulis `0x4393...b9E1`)
- Akun Vercel gratis (untuk hosting) — daftar di vercel.com, bisa login pakai GitHub

## Langkah 1 — Isi alamat payout

1. Buka MetaMask -> klik nama akun -> **Copy address**. Itu alamat lengkap
   42 karakter, diawali `0x`.
2. Di folder proyek ini, salin `.env.example` menjadi `.env`, lalu isi:
   `PAYOUT_WALLET=0x...` (alamat lengkap kamu).
   Jangan isi private key / seed phrase — hanya alamat publik.
3. Kalau deploy lewat Vercel, alamat ini juga harus diisi sebagai
   Environment Variable di dashboard Vercel (langkah 3).

## Langkah 2 — Tes di laptop

```powershell
npm install
node index.mjs
```

Di terminal lain (PowerShell baru):

```powershell
curl.exe http://localhost:4242/
curl.exe -i http://localhost:4242/quote
curl.exe http://localhost:4242/openapi.json
```

Yang harus kamu lihat:

- `/` -> JSON info API (gratis).
- `/quote` -> **HTTP 402** + header `PAYMENT-REQUIRED` + body JSON berisi
  penawaran (`x402Version: 2`, `accepts` dengan `scheme: exact`,
  `network: eip155:8453`, `amount: 5000`, `payTo` = alamat kamu).
- `/openapi.json` -> dokumen OpenAPI dengan `x-payment-info` di `GET /quote`.

Cek juga dengan CLI vAPI (tanpa membayar):

```powershell
vapi check http://localhost:4242/quote --method GET
```

Kalau ada keluhan soal private host, tambahkan `"allowPrivateNetwork": true`
ke `~/.vapi/config.json` dulu (hapus lagi setelah selesai). Targetnya:
`9 passed, 2 warnings, 0 failed` (2 warning soal extensions/discovery itu wajar).

## Langkah 3 — Deploy gratis ke Vercel

Paling gampang lewat Vercel CLI:

```powershell
npm i -g vercel
vercel login
vercel --prod
```

Ikuti pertanyaannya (project name bebas, misal `jason-quotes-api`).
Setelah deploy, kamu dapat URL, misal
`https://jason-quotes-api.vercel.app`.

Lalu isi environment variable di dashboard Vercel:

1. Buka vercel.com -> project kamu -> **Settings -> Environment Variables**.
2. Tambah `PAYOUT_WALLET` = alamat lengkap wallet kamu.
3. **Redeploy** (Deployments -> titik tiga -> Redeploy) supaya variabelnya aktif.

Tes URL publiknya:

```powershell
curl.exe -i https://jason-quotes-api.vercel.app/quote
```

Harus tetap 402 dengan `payTo` = alamat kamu. Kalau masih 0x000...0,
berarti environment variable belum aktif — redeploy lagi.

## Langkah 4 — Daftarkan di vAPI (quest selesai)

Buka https://api.vapinetwork.ai/call/my-apis/new (halaman yang sudah kamu buka):

1. **Discover** — Method `GET`, isi `https://jason-quotes-api.vercel.app/quote`
   (sesuaikan dengan URL kamu), klik **Check endpoint**, pilih operasinya.
2. **Describe** — isi nama (`Jason Quotes API`), deskripsi, kategori (`data`).
3. **Payout** — buktikan wallet payout lewat tanda tangan. Wallet ini
   HARUS sama dengan `payTo` di penawaran API (alamat yang kamu isi tadi).
4. **Saved** — klik **Go live**. vAPI akan probe ulang semua endpoint dan
   mengonfirmasi payout langsung ke wallet kamu.

Alternatif lewat CLI:

```powershell
vapi auth set-key
vapi publish https://jason-quotes-api.vercel.app --mode origin --select quote --name "Jason Quotes API" --description "Satu quote acak per panggilan, 0.005 USDC." --category data
vapi publish activate <slug>
```

Listing itu **permissionless**: begitu probe lolos, API kamu langsung live
di Discover dan quest 500 poin selesai otomatis. Tidak perlu menunggu review.

## Supaya tetap live

- API dicek ulang **tiap jam**. **3x gagal beruntun = listing di-suspend**
  dan hilang dari Discover. Jadi jangan matikan/hapus deployment Vercel-nya.
- Kalau kena suspend: perbaiki endpoint-nya, lalu klik **Go live** lagi di My APIs.
- vAPI **tidak ambil fee** — pembeli bayar langsung ke wallet kamu.

## Catatan

- Harga: `5000` = 0,005 USDC per panggilan (USDC punya 6 desimal).
- Pembayaran diverifikasi + diselesaikan lewat facilitator
  `https://x402.org/facilitator` (dipakai contoh resmi vAPI).
- Jangan pernah membagikan private key / seed phrase wallet payout.
