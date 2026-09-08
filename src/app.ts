import express from "express";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

app.get("/", (req, res) => {
  res.send("Hello from Express + TypeScript!");
});

app.use(errorHandler);

export default app;
