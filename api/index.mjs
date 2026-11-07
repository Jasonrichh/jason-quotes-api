import { handle } from "hono/vercel";
import app from "../app.mjs";

export default handle(app);
