import { hash, compare } from "bcrypt";

import { Prisma } from "../generated/prisma/client";
import { SignupBody, SigninBody, RefreshBody } from "../validators/auth";
import { prisma } from "../lib/prisma";
import { ConflictError, UnauthorizedError } from "../utils/ApiError";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";

const SALT_ROUNDS = 10;

export async function signup(data: SignupBody) {
  const hashedPassword = await hash(data.password, SALT_ROUNDS);

  try {
    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: "USER",
      },
      select: {
        name: true,
        email: true,
        id: true,
        role: true,
      },
    });

    return {
      user: newUser,
      refreshToken: generateRefreshToken({
        userId: newUser.id,
        role: "USER",
      }),
      accessToken: generateAccessToken({
        userId: newUser.id,
        role: "USER",
      }),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictError("Duplicate email error", "EMAIL_ALREADY_EXISTS");
    }

    throw error;
  }
}

export async function signin(data: SigninBody) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (!existingUser)
    throw new UnauthorizedError(
      "Invalid email or password", // generic message
      "INVALID_CREDENTIALS", // custom error code
    );

  const passwordCheck = await compare(data.password, existingUser.password);

  if (!passwordCheck)
    throw new UnauthorizedError(
      "Invalid email or password", // generic message
      "INVALID_CREDENTIALS", // custom error code
    );

  return {
    user: {
      name: existingUser.name,
      email: existingUser.email,
      id: existingUser.id,
      role: existingUser.role,
    },
    refreshToken: generateRefreshToken({
      userId: existingUser.id,
      role: existingUser.role,
    }),
    accessToken: generateAccessToken({
      userId: existingUser.id,
      role: existingUser.role,
    }),
  };
}

export async function refresh(data: RefreshBody) {
  try {
    const { role, userId } = verifyRefreshToken(data.refreshToken);

    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!existingUser)
      throw new UnauthorizedError(
        "Invalid email or password", // generic message
        "INVALID_CREDENTIALS", // custom error code
      );
    if (existingUser.role !== role)
      throw new UnauthorizedError(
        "Invalid role", // generic message
        "INVALID_ROLE", // custom error code
      );

    return {
      refreshToken: generateRefreshToken({
        userId,
        role,
      }),
      accessToken: generateAccessToken({
        userId,
        role,
      }),
    };
  } catch (error) {
    throw new UnauthorizedError(
      "Invalid refresh token",
      "INVALID_REFRESH_TOKEN",
    );
  }
}
