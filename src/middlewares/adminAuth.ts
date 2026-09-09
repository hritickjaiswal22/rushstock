import { NextFunction, Request, Response } from "express";
import { ForbiddenError } from "../utils/ApiError";

export function adminAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;

  if (!user || user.role !== "ADMIN")
    throw new ForbiddenError(
      "Only admin users can create sale events",
      "ADMIN_ACCESS_ONLY",
    );

  next();
}
