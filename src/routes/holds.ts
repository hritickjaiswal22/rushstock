import { Router } from "express";

import { authMiddleware } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { postHoldSchema } from "../validators/holds";
import { postHoldController } from "../controllers/holds";

const holdsRouter = Router(); // Initialize the router instance

holdsRouter.post(
  "/",
  authMiddleware,
  validate(postHoldSchema),
  postHoldController,
);

export { holdsRouter };
