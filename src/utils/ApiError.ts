export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    errorCode: string,
    message: string,
    isOperational = true,
    details?: unknown,
    stack = "",
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Common error types
export class BadRequestError extends ApiError {
  constructor(message = "Bad Request", errorCode: string, details?: unknown) {
    super(400, errorCode, message, true, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized", errorCode: string, details?: unknown) {
    super(401, errorCode, message, true, details);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden", errorCode: string, details?: unknown) {
    super(403, errorCode, message, true, details);
  }
}

export class NotFoundError extends ApiError {
  constructor(
    message = "Resource not found",
    errorCode: string,
    details?: unknown,
  ) {
    super(404, errorCode, message, true, details);
  }
}

export class ConflictError extends ApiError {
  constructor(message = "Conflict", errorCode: string, details?: unknown) {
    super(409, errorCode, message, true, details);
  }
}

export class ValidationError extends ApiError {
  constructor(
    message = "Validation failed",
    errorCode: string,
    details?: unknown,
  ) {
    super(422, errorCode, message, true, details);
  }
}

export class InternalServerError extends ApiError {
  constructor(
    message = "Internal Server Error",
    errorCode: string,
    details?: unknown,
  ) {
    super(500, errorCode, message, false, details); // Not operational (programming error)
  }
}
