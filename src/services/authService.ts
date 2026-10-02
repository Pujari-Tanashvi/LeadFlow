import { apiRequest, configureApiAuth } from "./apiClient";
import { API_ENDPOINTS } from "./endpoints";
import type { ApiAuthResponse, ApiUser } from "./apiTypes";

const TOKEN_STORAGE_KEY = "leadflow.accessToken";

export interface RegisterInput {
  brokerageName: string;
  fullName: string;
  email: string;
  password: string;
}

export interface AuthSession {
  token: string;
  user: ApiUser;
}

/** Persisted JWT. Read synchronously so a refresh can restore the session. */
export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Storage can be unavailable (private mode); the in-memory token still works
    // for the lifetime of the tab.
  }
}

export function clearStoredToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Wire the transport layer to the auth store. The in-memory token is the
 * source of truth while the tab lives; localStorage is only the cold-start
 * fallback.
 */
export function installAuthTransport(getToken: () => string | null): void {
  configureApiAuth({ getToken });
}

export async function login(
  email: string,
  password: string,
): Promise<AuthSession> {
  const response = await apiRequest<ApiAuthResponse>(API_ENDPOINTS.auth.login, {
    method: "POST",
    body: { email, password },
    authenticated: false,
  });
  return response;
}

export async function register(input: RegisterInput): Promise<AuthSession> {
  const response = await apiRequest<ApiAuthResponse>(
    API_ENDPOINTS.auth.register,
    { method: "POST", body: input, authenticated: false },
  );
  return response;
}

/** Resolve the signed-in account; used to validate a restored token. */
export async function fetchCurrentUser(): Promise<ApiUser> {
  const response = await apiRequest<{ user: ApiUser }>(API_ENDPOINTS.auth.me);
  return response.user;
}

/** Complete the emailed client activation flow. */
export async function activateClientAccount(
  activationToken: string,
  password: string,
): Promise<void> {
  await apiRequest<void>(API_ENDPOINTS.auth.activateClient, {
    method: "POST",
    body: { activationToken, password },
    authenticated: false,
  });
}

export async function checkHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    await apiRequest<unknown>(API_ENDPOINTS.health, {
      authenticated: false,
      signal,
    });
    return true;
  } catch {
    return false;
  }
}
