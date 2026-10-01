import type { RequestHandler } from "express";
import {
  getAuthenticatedUser,
  login,
  registerBrokerage,
} from "../services/userService.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  body: Record<string, unknown>,
  field: string,
): string | null {
  const value = body[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPassword(body: Record<string, unknown>): string | null {
  const value = body.password;
  return typeof value === "string" && value.length > 0 ? value : null;
}

export const register: RequestHandler = async (request, response, next) => {
  if (!isRecord(request.body)) {
    response.status(400).json({ error: "A JSON request body is required." });
    return;
  }

  const brokerageName = readString(request.body, "brokerageName");
  const fullName = readString(request.body, "fullName");
  const email = readString(request.body, "email");
  const password = readPassword(request.body);

  if (!brokerageName || !fullName || !email || !password) {
    response.status(400).json({
      error: "brokerageName, fullName, email, and password are required.",
    });
    return;
  }

  if (password.length < 8) {
    response
      .status(400)
      .json({ error: "Password must be at least 8 characters." });
    return;
  }

  if (Buffer.byteLength(password, "utf8") > 72) {
    response
      .status(400)
      .json({ error: "Password must be no more than 72 UTF-8 bytes." });
    return;
  }

  if (fullName.length > 120 || brokerageName.length > 160) {
    response
      .status(400)
      .json({ error: "Name fields exceed their maximum length." });
    return;
  }

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    response.status(400).json({ error: "A valid email address is required." });
    return;
  }

  try {
    const result = await registerBrokerage({
      brokerageName,
      fullName,
      email,
      password,
    });
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const loginUser: RequestHandler = async (request, response, next) => {
  if (!isRecord(request.body)) {
    response.status(400).json({ error: "A JSON request body is required." });
    return;
  }

  const email = readString(request.body, "email");
  const password = readPassword(request.body);

  if (!email || !password) {
    response.status(400).json({ error: "email and password are required." });
    return;
  }

  try {
    const result = await login(email, password);
    if (!result) {
      response.status(401).json({ error: "Invalid email or password." });
      return;
    }

    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    if (!request.auth) {
      response.status(401).json({ error: "Authentication required." });
      return;
    }

    const user = await getAuthenticatedUser(request.auth.userId);
    if (!user) {
      response.status(401).json({ error: "Account is no longer available." });
      return;
    }

    response.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};
