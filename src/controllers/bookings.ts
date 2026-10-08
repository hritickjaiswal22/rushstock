import { Request, Response } from "express";

import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { postBooking } from "../services/bookings";
import { PostBookingBody } from "../validators/bookings";

export const postBookingController = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user;
    const body = req.body as PostBookingBody;

    const booking = await postBooking(body, user?.userId as string);

    return ApiResponse.created(
      res,
      booking,
      body.paymentState === "FAIL"
        ? "Booking failed"
        : "Booking created successfully",
    );
  },
);
