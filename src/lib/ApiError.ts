export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    statusCode: number,
    message: string,
    isOperational = true,
    details?: any,
    stack = "",
  ) {
    super(message);
    this.statusCode = statusCode;
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
  constructor(message = "Bad Request", details?: any) {
    super(400, message, true, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized", details?: any) {
    super(401, message, true, details);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden", details?: any) {
    super(403, message, true, details);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Resource not found", details?: any) {
    super(404, message, true, details);
  }
}

export class ConflictError extends ApiError {
  constructor(message = "Conflict", details?: any) {
    super(409, message, true, details);
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Validation failed", details?: any) {
    super(422, message, true, details);
  }
}

export class InternalServerError extends ApiError {
  constructor(message = "Internal Server Error", details?: any) {
    super(500, message, false, details); // Not operational (programming error)
  }
}
