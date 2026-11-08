import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// ---- Konfigurasi pembayaran (x402 di Base) ----
// Sesuai contoh resmi vAPI: docs.vapinetwork.ai/call/sell-on-call/list-your-api
const FACILITATOR = "https://facilitator.payai.network"; // verifikasi + settlement pembayaran (x402.org tidak mendukung Base mainnet)
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC resmi di Base
const NETWORK = "eip155:8453"; // Base
const PRICE_AMOUNT = "5000"; // 0.005 USDC per panggilan (USDC punya 6 desimal)
const PAYOUT_WALLET =
  process.env.PAYOUT_WALLET || "0x0000000000000000000000000000000000000000";

if (PAYOUT_WALLET === "0x0000000000000000000000000000000000000000") {
  console.warn(
    "[PERINGATAN] PAYOUT_WALLET belum diisi! Isi dengan alamat wallet kamu " +
      "(lihat PANDUAN.md) — kalau tidak, listing vAPI akan gagal di probe."
  );
}

// ---- Isi API: satu quote acak per panggilan ----
const QUOTES = [
  { text: "The best way to predict the future is to invent it.", author: "Alan Kay" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson" },
  { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "What gets measured gets managed.", author: "Peter Drucker" },
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  { text: "The journey of a thousand miles begins with one step.", author: "Lao Tzu" },
];

// URL publik API seperti yang dilihat pemanggil: Vercel mengakhiri TLS di
// edge lalu meneruskan ke fungsi lewat HTTP biasa, jadi c.req.url berskema
// http://... — padahal URL publiknya https://... Probe vAPI menolak
// penawaran yang resource.url-nya tidak cocok dengan URL yang di-probe,
// jadi hormati header x-forwarded-proto / x-forwarded-host dari Vercel.
function publicOrigin(c) {
  const u = new URL(c.req.url);
  const proto =
    c.req.header("x-forwarded-proto") || u.protocol.replace(":", "");
  const host =
    c.req.header("x-forwarded-host") || c.req.header("host") || u.host;
  return `${proto}://${host}`;
}

function publicUrl(c) {
  const u = new URL(c.req.url);
  return `${publicOrigin(c)}${u.pathname}${u.search}`;
}

function buildOffer(c) {
  return {
    x402Version: 2,
    error: "Payment required",
    resource: {
      url: publicUrl(c),
      description: "Satu quote acak + nama penulisnya.",
      mimeType: "application/json",
      serviceName: "Jason Quotes API",
    },
    accepts: [
      {
        scheme: "exact",
        network: NETWORK,
        amount: PRICE_AMOUNT,
        asset: USDC_BASE,
        payTo: PAYOUT_WALLET,
        maxTimeoutSeconds: 120,
        extra: { name: "USD Coin", version: "2" },
      },
    ],
  };
}

app.use(
  "*",
  cors({ origin: "*", exposeHeaders: ["PAYMENT-REQUIRED", "PAYMENT-RESPONSE"] })
);

// Info gratis — supaya orang tahu API ini apa sebelum membayar.
app.get("/", (c) =>
  c.json({
    name: "Jason Quotes API",
    description:
      "API berbayar (x402): 0.005 USDC per panggilan untuk satu quote acak.",
    price: "0.005 USDC per call, dibayar di Base",
    payout_wallet: PAYOUT_WALLET,
    endpoints: {
      quote: "GET /quote (berbayar)",
      openapi: "GET /openapi.json (gratis)",
    },
  })
);

// Dokumen OpenAPI — dipakai vAPI untuk menemukan operasi berbayar.
app.get("/openapi.json", (c) =>
  c.json({
    openapi: "3.0.3",
    info: {
      title: "Jason Quotes API",
      version: "1.0.0",
      description:
        "Satu quote acak per panggilan, dibayar 0.005 USDC lewat x402 di Base.",
    },
    servers: [{ url: publicOrigin(c) }],
    paths: {
      "/quote": {
        get: {
          "x-payment-info": buildOffer(c).accepts[0],
          responses: {
            200: { description: "Satu quote acak." },
            402: { description: "Payment required" },
          },
        },
      },
    },
  })
);

// Endpoint berbayar.
app.get("/quote", async (c) => {
  const offer = buildOffer(c);
  const encoded = c.req.header("PAYMENT-SIGNATURE");

  // Belum ada pembayaran -> jawab 402 dengan penawarannya.
  if (!encoded) {
    return c.json(offer, 402, {
      "PAYMENT-REQUIRED": btoa(JSON.stringify(offer)),
    });
  }

  let payment;
  try {
    payment = JSON.parse(atob(encoded));
  } catch {
    return c.json({ error: "Invalid payment" }, 400);
  }

  const body = {
    x402Version: 2,
    paymentPayload: payment,
    paymentRequirements: offer.accepts[0],
  };
  const headers = { "content-type": "application/json" };

  const verify = await fetch(`${FACILITATOR}/verify`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const verified = await verify.json();
  if (!verify.ok || !verified.isValid) {
    return c.json({ error: "Payment verification failed" }, 402);
  }

  const settle = await fetch(`${FACILITATOR}/settle`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const settlement = await settle.json();
  if (!settle.ok || !settlement.success) {
    return c.json({ error: "Payment settlement failed" }, 502);
  }

  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  return c.json({ quote: quote.text, author: quote.author }, 200, {
    "PAYMENT-RESPONSE": btoa(JSON.stringify(settlement)),
  });
});

export default app;
