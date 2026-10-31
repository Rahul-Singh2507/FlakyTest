import { settings } from "./config/env.js";
import { initDb } from "./config/database.js";
import { app } from "./app.js";

initDb();

app.listen(settings.port, () => {
  console.log(` Backend running on port ${settings.port}`);
});
