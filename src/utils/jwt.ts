import { sign, verify, SignOptions } from "jsonwebtoken";
import { Role } from "../generated/prisma/enums";

export interface JWTPayloadType {
  userId: string;
  role: Role;
}

const accessSecretKey = process.env.JWT_ACCESS_SECRET as string;
const refreshSecretKey = process.env.JWT_REFRESH_SECRET as string;

export function generateAccessToken(payload: JWTPayloadType) {
  const token = sign(payload, accessSecretKey, {
    expiresIn: (process.env.ACCESS_TOKEN_EXPIRES_IN ||
      "15m") as SignOptions["expiresIn"],
  });

  return token;
}

export function generateRefreshToken(payload: JWTPayloadType) {
  const token = sign(payload, refreshSecretKey, {
    expiresIn: (process.env.REFRESH_TOKEN_EXPIRES_IN ||
      "168h") as SignOptions["expiresIn"],
  });

  return token;
}

export function verifyAccessToken(token: string): JWTPayloadType {
  const payload = verify(token, accessSecretKey);

  return payload as JWTPayloadType;
}

export function verifyRefreshToken(token: string): JWTPayloadType {
  const payload = verify(token, refreshSecretKey);

  return payload as JWTPayloadType;
}
