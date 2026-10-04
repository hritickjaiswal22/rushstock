import express from "express";
import { errorHandler } from "./middlewares/errorHandler";
import { authRouter } from "./routes/auth";
import { salesRouter } from "./routes/sales";
import { bookingsRouter } from "./routes/bookings";
import { holdsRouter } from "./routes/holds";

const app = express();

app.use(express.json());

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/sales", salesRouter);
app.use("/api/v1/reservations", bookingsRouter);
app.use("/api/v1/reserve", holdsRouter);

app.use(errorHandler);

export default app;
