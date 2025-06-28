import app from "./index.js";
import serverless from "serverless-http";

export const handler = serverless(app); // Vercel expects `handler` named export
export default handler;
