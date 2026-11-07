// Vercel serverless entry point (Node runtime).
//
// PENTING: pakai adapter Node dari @hono/node-server, BUKAN hono/vercel.
// hono/vercel meneruskan mentah Node IncomingMessage ke app.fetch —
// .headers-nya objek biasa (tanpa .get) sehingga middleware CORS crash
// ("this.raw.headers.get is not a function") dan Vercel mengabaikan
// Response yang dikembalikan -> fungsi menggantung 300 detik -> 504.
// Adapter ini mengubah pasangan Node (req, res) menjadi Web Request/
// Response asli, lalu menulis hasilnya kembali ke res.
import { handle } from '@hono/node-server/vercel';
import app from '../app.mjs';

export default handle(app);
