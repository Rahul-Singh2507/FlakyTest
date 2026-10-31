import express from "express";
import cors from "cors";
import errorHandler from "./middleware/errorHandler.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", apiRouter);
app.use(errorHandler);
