import { Router } from "express";
import {
  signupController,
  signinController,
  refreshController,
} from "../controllers/auth";
import { validate } from "../middlewares/validate";
import { signupSchema, signinSchema, refreshSchema } from "../validators/auth";

const authRouter = Router(); // Initialize the router instance

authRouter.post("/signup", validate(signupSchema), signupController);
authRouter.post("/signin", validate(signinSchema), signinController);
authRouter.post("/refresh", validate(refreshSchema), refreshController);

export { authRouter };
