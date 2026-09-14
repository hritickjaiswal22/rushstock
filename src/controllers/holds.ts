import { Request, Response } from "express";

import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { postHold } from "../services/holds";

export const postHoldController = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user;
    const body = req.body;

    const hold = await postHold(body, user?.userId as string);

    return ApiResponse.created(
      res,
      hold,
      "Hold created successfully - Make the payment within next 5 mins",
    );
  },
);
