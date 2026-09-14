import { Router } from "express";

import { authMiddleware } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { postHoldSchema } from "../validators/holds";
import { postHoldController } from "../controllers/holds";

const bookingsRouter = Router(); // Initialize the router instance

bookingsRouter.post(
  "/",
  authMiddleware,
  validate(postHoldSchema),
  postHoldController,
);

export { bookingsRouter };
