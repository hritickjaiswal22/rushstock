import { Router } from "express";
import { postSaleController } from "../controllers/sales";
import { validate } from "../middlewares/validate";
import { authMiddleware } from "../middlewares/auth";
import { postSaleSchema } from "../validators/sales";
import { adminAuthMiddleware } from "../middlewares/adminAuth";

const salesRouter = Router(); // Initialize the router instance

salesRouter.post(
  "/",
  authMiddleware,
  adminAuthMiddleware,
  validate(postSaleSchema),
  postSaleController,
);

export { salesRouter };
