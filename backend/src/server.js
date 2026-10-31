import { settings } from "./config/env.js";
import { connectDb } from "./config/database.js";
import { app } from "./app.js";

await connectDb();

app.listen(settings.port, () => {
  console.log(` Backend running on port ${settings.port}`);
});
