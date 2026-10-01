import { Request, Response } from "express";

import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { createHold } from "../services/holds";
import { MAX_HOLD_INTERVAL_SECONDS } from "../utils/constants";

export const postHoldController = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user;
    const body = req.body;

    const hold = await createHold(body, user?.userId as string);

    return ApiResponse.created(
      res,
      hold,
      `Hold created successfully - Make the payment within next ${MAX_HOLD_INTERVAL_SECONDS} seconds`,
    );
  },
);
