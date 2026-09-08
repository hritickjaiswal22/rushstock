import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { UnauthorizedError, BadRequestError } from "../utils/ApiError";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader)
    throw new UnauthorizedError(
      "Authentication credentials are required. The 'Authorization' header is missing.",
      "AUTH_HEADER_MISSING",
    );

  const authHeaderArr = authHeader.split(" ");

  if (authHeaderArr.length !== 2 || authHeaderArr[0] !== "Bearer")
    throw new BadRequestError(
      "Malformed Authorization header. Expected format: 'Bearer <token>'.",
      "MALFORMED_AUTH_HEADER",
    );

  try {
    const jwtPayload = verifyAccessToken(authHeaderArr[1]);

    req.user = jwtPayload;

    next();
  } catch (error) {
    throw new UnauthorizedError(
      "Invalid or expired access token.",
      "INVALID_ACCESS_TOKEN",
    );
  }
}
