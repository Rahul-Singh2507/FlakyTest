import express from "express";
import cors from "cors";
import { settings } from "./config/env.js";
import errorHandler from "./middleware/errorHandler.js";
import { apiRouter } from "./routes/index.js";

const app = express();

app.use(cors({ origin: settings.frontendOrigin, credentials: true }));
app.use(express.json());
app.use("/api", apiRouter);
app.use(errorHandler);

export { app };
