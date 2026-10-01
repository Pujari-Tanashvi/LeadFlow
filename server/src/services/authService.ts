import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

const passwordRounds = 12;
const tokenLifetime: SignOptions["expiresIn"] = "1h";

function getJwtSecret(): string {
  if (!env.jwtSecret || env.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }

  return env.jwtSecret;
}

export function assertJwtConfiguration(): void {
  getJwtSecret();
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, passwordRounds);
}

export function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function createAccessToken(userId: string): string {
  return jwt.sign({}, getJwtSecret(), {
    subject: userId,
    expiresIn: tokenLifetime,
  });
}

export function verifyAccessToken(token: string): string {
  const payload = jwt.verify(token, getJwtSecret());
  if (typeof payload === "string" || !payload.sub) {
    throw new Error("Invalid access token.");
  }

  return payload.sub;
}
