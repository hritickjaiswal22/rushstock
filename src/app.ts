import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.send("Hello from Express + TypeScript!");
});

export default app;
