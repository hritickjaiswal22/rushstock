import { Request, Response } from "express";
import { signup, signin, refresh } from "../services/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";

export const signupController = asyncHandler(
  async (req: Request, res: Response) => {
    const newUser = await signup(req.body);

    return ApiResponse.created(res, newUser, "User created successfully");
  },
);

export const signinController = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await signin(req.body);

    return ApiResponse.success(res, data, "User logged in successfully");
  },
);

export const refreshController = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await refresh(req.body);

    return ApiResponse.success(res, data, "User tokens refreshed");
  },
);
