import express from "express";
import { errorHandler } from "./middlewares/errorHandler";
import { authRouter } from "./routes/auth";

const app = express();

app.use(express.json());

app.use("/api/v1/auth", authRouter);

app.use(errorHandler);

export default app;
