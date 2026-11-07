import { serve } from "@hono/node-server";
import app from "./app.mjs";

const port = Number(process.env.PORT || 4242);
serve({ fetch: app.fetch, port });
console.log(`Jason Quotes API jalan di http://localhost:${port}`);
console.log(`Tes gratis : curl http://localhost:${port}/`);
console.log(`Tes berbayar: curl -i http://localhost:${port}/quote  (harusnya 402)`);
