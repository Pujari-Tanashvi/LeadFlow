import { buildQuery, type QueryParams } from "./endpoints";

/** Error thrown for any non-2xx API response, carrying the server message. */
export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** True when the failure is a transport problem rather than an API answer. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

type TokenProvider = () => string | null;
type UnauthorizedHandler = () => void;

let tokenProvider: TokenProvider = () => null;
let onUnauthorized: UnauthorizedHandler = () => {};

/**
 * The auth context installs these so the transport layer can attach the JWT
 * without importing React state (keeps the services testable in isolation).
 */
export function configureApiAuth(options: {
  getToken: TokenProvider;
  onUnauthorized?: UnauthorizedHandler;
}): void {
  tokenProvider = options.getToken;
  onUnauthorized = options.onUnauthorized ?? (() => {});
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** JSON body. Omit for requests without a payload. */
  body?: unknown;
  query?: QueryParams;
  /** Send `false` for the public endpoints (login/register/health). */
  authenticated?: boolean;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/** Shape of the JSON error envelope every failing endpoint returns. */
function readErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const message = (payload as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

/**
 * Explain a status the user can actually act on.
 *
 * When the browser reaches the Vite dev server but the Express API is not
 * running, the proxy answers 502/503/504 with an empty body. Surfacing the bare
 * status makes it look like the login itself is broken, so it is translated
 * into the actual cause: the API process is missing.
 */
function explainStatus(status: number): string {
  switch (status) {
    case 502:
      return "The LeadFlow API is not running. Start it with `npm run dev` (which starts the API and the web server together).";
    case 503:
      return "The LeadFlow API is running but is not ready to serve requests yet. Wait a moment and try again.";
    case 504:
      return "The LeadFlow API took too long to respond. Check the API logs and that MongoDB is running.";
    case 0:
      return "The LeadFlow API is unreachable. Check that the server is running.";
    default:
      return `Request failed with status ${status}.`;
  }
}

/** Prefer the server's own message; fall back to an actionable explanation. */
function describeFailure(
  payload: unknown,
  status: number,
  subject: string,
): string {
  const parsed = readErrorMessage(payload, "");
  return parsed || `${subject} ${explainStatus(status)}`.trim();
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function buildHeaders(options: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  const usesAuth = options.authenticated !== false;
  if (usesAuth) {
    const token = tokenProvider();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function performRequest(
  url: string,
  options: RequestOptions,
): Promise<Response> {
  const hasBody = options.body !== undefined;
  const headers = buildHeaders(options);
  if (hasBody && !(options.headers?.["Content-Type"] ?? headers["Content-Type"])) {
    headers["Content-Type"] = "application/json";
  }

  try {
    return await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(
      "The LeadFlow API is unreachable. Check that the server is running.",
      0,
      error,
    );
  }
}

/**
 * Perform an authenticated (by default) JSON request against the LeadFlow API.
 * Throws {@link ApiError} for every non-2xx response so callers can render a
 * proper error state instead of guessing.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${path}${buildQuery(options.query)}`;
  const response = await performRequest(url, options);
  const payload = await parseBody(response);

  if (!response.ok) {
    if (
      response.status === 401 &&
      (options.authenticated !== false)
    ) {
      onUnauthorized();
    }
    throw new ApiError(
      describeFailure(payload, response.status, "Request failed."),
      response.status,
      payload,
    );
  }

  return payload as T;
}

/** Download a protected binary (e.g. a document file) as a Blob. */
export async function apiDownload(
  path: string,
  options: RequestOptions = {},
): Promise<Blob> {
  const response = await performRequest(path, options);
  if (!response.ok) {
    const payload = await parseBody(response);
    if (response.status === 401 && options.authenticated !== false) {
      onUnauthorized();
    }
    throw new ApiError(
      describeFailure(payload, response.status, "Download failed."),
      response.status,
      payload,
    );
  }
  return response.blob();
}

/** `multipart/form-data` upload used by the document endpoints. */
export async function apiUpload<T>(
  path: string,
  form: FormData,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${path}${buildQuery(options.query)}`;
  const response = await fetch(url, {
    method: options.method ?? "POST",
    headers: buildHeaders({ ...options, body: undefined }),
    body: form,
    signal: options.signal,
  });
  const payload = await parseBody(response);

  if (!response.ok) {
    if (response.status === 401) onUnauthorized();
    throw new ApiError(
      describeFailure(payload, response.status, "Upload failed."),
      response.status,
      payload,
    );
  }

  return payload as T;
}

/** Whether the API answered at all — used for the connection banner. */
export async function pingApi(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch("/api/health", { signal });
    return response.ok;
  } catch {
    return false;
  }
}
