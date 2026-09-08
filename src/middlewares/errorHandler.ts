// src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from "express";

import { ApiError, InternalServerError } from "../utils/ApiError";
import { HttpStatus } from "../utils/httpStatus"; // or use http-status-codes

interface ErrorResponse {
  success: false;
  error: {
    code: number;
    statusCode: string;
    message: string;
    details?: any;
  };
  stack?: string; // Optional in development
}

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let error: ApiError;

  if (err instanceof ApiError) {
    error = err;
  } else {
    // Unknown error → convert to InternalServerError
    console.error("Unexpected error:", err);
    error = new InternalServerError(
      "Something went wrong",
      "INTERNAL_SERVER_ERROR",
    );
  }

  const response: ErrorResponse = {
    success: false,
    error: {
      code: error.statusCode,
      statusCode: error.errorCode,
      message: error.message,
      details: error.details,
    },
  };

  // Include stack trace in development environment
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  // Log operational errors normally, programming errors as errors
  if (error.isOperational) {
    console.warn(`Operational error: ${error.message}`);
  } else {
    console.error(`Programming error: ${err.stack}`);
  }

  res.status(error.statusCode).json(response);
};
