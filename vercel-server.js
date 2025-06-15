import app from "./index.js";
import connectDB from "./db.js"; // We'll extract DB logic there
import serverless from "serverless-http";

await connectDB();

export default serverless(app);
