import { Router } from "express";

import { authMiddleware } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { postBookingSchema } from "../validators/bookings";
import { postBookingController } from "../controllers/bookings";

const bookingsRouter = Router(); // Initialize the router instance

bookingsRouter.post(
  "/",
  authMiddleware,
  validate(postBookingSchema),
  postBookingController,
);

export { bookingsRouter };
