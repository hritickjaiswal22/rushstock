import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { ValidationError } from "../utils/ApiError";

export function validate<T extends z.ZodObject<z.core.$ZodShape>>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
    });

    if (!result.success) {
      const { error } = result;
      const formattedErrors = z.treeifyError(error);

      throw new ValidationError(
        "Invalid Request Data",
        "INVALID_REQUEST_DATA",
        formattedErrors,
      );
    }

    req.body = result.data.body;

    next();
  };
}
