import express from "express";
import { errorHandler } from "./middlewares/errorHandler";
import { authRouter } from "./routes/auth";
import { salesRouter } from "./routes/sales";

const app = express();

app.use(express.json());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/sales", salesRouter);

app.use(errorHandler);

export default app;
