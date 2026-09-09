import { Request, Response } from "express";
import { postSale } from "../services/sales";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";

export const postSaleController = asyncHandler(
  async (req: Request, res: Response) => {
    const newSale = await postSale(req.body);

    return ApiResponse.created(res, newSale, "Sale event created successfully");
  },
);
