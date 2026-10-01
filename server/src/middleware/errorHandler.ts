import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (error && typeof error === "object" && "type" in error) {
    if (error.type === "entity.parse.failed") {
      response
        .status(400)
        .json({ error: "Request body must contain valid JSON." });
      return;
    }
    if (error.type === "entity.too.large") {
      response.status(413).json({ error: "Request body is too large." });
      return;
    }
  }

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
    response.status(409).json({
      error: "A record with these unique fields already exists.",
    });
    return;
  }

  response.status(500).json({ error: "Internal server error." });
};
