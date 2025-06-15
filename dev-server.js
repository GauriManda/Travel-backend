import app from "./index.js";
import connectDB from "./db.js";

const port = process.env.PORT || 4000;

connectDB().then(() => {
  app.listen(port, () => {
    console.log(`✅ Dev Server running on http://localhost:${port}`);
  });
});
