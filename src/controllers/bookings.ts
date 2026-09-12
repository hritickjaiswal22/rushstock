import { Request, Response } from "express";

import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { postBooking } from "../services/bookings";

export const postBookingController = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user;
    const body = req.body;

    const booking = await postBooking(body, user?.userId as string);

    return ApiResponse.created(res, booking, "Booking created successfully");
  },
);
