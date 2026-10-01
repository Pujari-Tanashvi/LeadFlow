import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  console.error(error);

  if (error && typeof error === "object" && "statusCode" in error) {
    const statusCode = Number(error.statusCode);
    if (statusCode >= 400 && statusCode < 500) {
      response.status(statusCode).json({
        error: "message" in error ? String(error.message) : "Request failed.",
      });
      return;
    }
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === 11000
  ) {
    response
      .status(409)
      .json({ error: "An account with this email already exists." });
    return;
  }

  response.status(500).json({ error: "Internal server error." });
};
