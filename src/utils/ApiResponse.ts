// src/utils/ApiResponse.ts
import { Response } from "express";

interface SuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
  meta?: Record<string, any>; // For pagination, etc.
}

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    message = "Success",
    statusCode = 200,
    meta?: Record<string, any>,
  ): Response {
    const responseBody: SuccessResponse<T> = {
      success: true,
      message,
      data,
    };
    if (meta) responseBody.meta = meta;
    return res.status(statusCode).json(responseBody);
  }

  // For sending created resources
  static created<T>(
    res: Response,
    data: T,
    message = "Resource created successfully",
  ): Response {
    return this.success(res, data, message, 201);
  }

  // For no content
  static noContent(res: Response): Response {
    return res.status(204).send();
  }
}
