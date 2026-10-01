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

  if (error && typeof error === "object" && "code" in error) {
    if (error.code === "LIMIT_FILE_SIZE") {
      response
        .status(413)
        .json({ error: "Document exceeds the 10 MB upload limit." });
      return;
    }
    if (
      error.code === "LIMIT_UNEXPECTED_FILE" ||
      error.code === "LIMIT_FILE_COUNT"
    ) {
      response
        .status(400)
        .json({ error: "Upload exactly one file using the file field." });
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
    error instanceof Error &&
    error.message === "Only PDF, JPEG, PNG, and WebP documents are accepted."
  ) {
    response.status(415).json({ error: error.message });
    return;
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
