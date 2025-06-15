import app from "./index.js";
import connectDB from "./db.js";
import serverless from "serverless-http";

await connectDB();

export default serverless(app);
